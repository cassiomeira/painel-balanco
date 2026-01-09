import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

interface Log {
  id: number;
  created_at: string;
  product_code: string;
  quantity: number;
  product_name: string | null;
  user_id: string;
  user_email?: string;
  needs_correction?: boolean;
}

export default function App() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLog, setEditLog] = useState<Log | null>(null);
  const [newQty, setNewQty] = useState("");
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [searchResult, setSearchResult] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, counted: 0 });

  useEffect(() => {
    fetchLogs();
    fetchStats();

    // Realtime subscription for logs
    const channel = supabase
      .channel('table_db_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_logs' }, (payload) => {
        setLogs((prev) => [payload.new as Log, ...prev]);
        fetchStats(); // Update stats on new scan
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  const fetchStats = async () => {
    const { count: total } = await supabase.from('products_base').select('*', { count: 'exact', head: true });
    const { count: counted } = await supabase.from('products_base').select('*', { count: 'exact', head: true }).gt('current_quantity', 0);

    setStats({
      total: total || 0,
      counted: counted || 0
    });
  }

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching logs:', error);
    else setLogs(data || []);
    setLoading(false);
  };

  const handleDeleteClick = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esse registro?")) {
      const { error } = await supabase.from('inventory_logs').delete().eq('id', id);
      if (error) alert("Erro ao excluir: " + error.message);
      else {
        // UI updates automatically via subscription, but we can optimistically remove it
        setLogs(prev => prev.filter(l => l.id !== id));
      }
    }
  }

  const handleEditClick = (log: Log) => {
    setEditLog(log);
    setNewQty(log.quantity.toString());
  }

  const saveEdit = async () => {
    if (editLog && newQty) {
      const qty = parseInt(newQty);
      if (isNaN(qty)) return alert("Quantidade inválida");

      const { error } = await supabase
        .from('inventory_logs')
        .update({ quantity: qty })
        .eq('id', editLog.id);

      if (error) alert("Erro ao atualizar: " + error.message);
      else {
        // Optimistic update
        setLogs(prev => prev.map(l => l.id === editLog.id ? { ...l, quantity: qty } : l));
        setEditLog(null);
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (data.length < 2) return alert("Planilha vazia ou sem cabeçalho.");

      // 1. Encontrar índices das colunas pelo cabeçalho (Linha 0)
      const headerRow = data[0].map((cell: any) => cell?.toString().toUpperCase().trim());

      const idxInterno = headerRow.indexOf("INTERNO");
      const idxDesc = headerRow.indexOf("DESCRICAO");
      const idxDesc2 = headerRow.indexOf("DESCRIÇÃO");
      const idxEan = headerRow.findIndex((h: string) => h && h.includes("EAN"));
      // Tentar encontrar coluna de quantidade/estoque (mais variações)
      const idxQty = headerRow.findIndex((h: string) =>
        h && (h.includes("QTDE") || h.includes("QTD") || h.includes("ESTOQUE") || h.includes("QUANTIDADE") || h.includes("SALDO") || h.includes("ATUAL"))
      );

      console.log('📊 Colunas detectadas:', {
        Interno: idxInterno,
        Desc: finalIdxDesc,
        Ean: idxEan,
        Qty: idxQty
      });

      if (finalIdxDesc === -1 || idxEan === -1) {
        return alert(`Erro: Colunas obrigatórias não encontradas.\nDetectado: ${headerRow.join(', ')}`);
      }

      const productsToInsert = [];

      // 2. Ler dados (Começa da linha 1)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;

        const interno = idxInterno !== -1 ? row[idxInterno] : null;
        const desc = row[finalIdxDesc];
        const ean = row[idxEan];
        const qty = idxQty !== -1 ? parseInt(row[idxQty]) : 0;

        if (desc || ean) {
          productsToInsert.push({
            internal_code: interno ? interno.toString() : null,
            description: desc ? desc.toString() : null,
            ean: ean ? ean.toString() : null,
            expected_quantity: isNaN(qty) ? 0 : qty,
            current_quantity: 0
          });
        }
      }

      if (productsToInsert.length > 0) {
        // Insert in chunks to avoid payload too large (Supabase limit)
        const chunkSize = 100;
        let errorCount = 0;
        for (let i = 0; i < productsToInsert.length; i += chunkSize) {
          const chunk = productsToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('products_base').insert(chunk);
          if (error) {
            console.error("Erro import:", error);
            errorCount++;
          }
        }

        if (errorCount === 0) alert(`Sucesso! ${productsToInsert.length} produtos importados.`);
        else alert(`Importação concluída com ${errorCount} erros de lote. Verifique o console.`);
      } else {
        alert("Nenhum dado válido encontrado na planilha.");
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleSearchProduct = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 3) {
      setSearchResult([]);
      return;
    }

    const { data } = await supabase
      .from('products_base')
      .select('*')
      .or(`description.ilike.%${term}%,ean.eq.${term},internal_code.eq.${term}`)
      .limit(1000);

    setSearchResult(data || []);
  }

  const handleExportCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Data,Codigo,Nome,Quantidade,Usuario\n"
      + logs.map(e => `${new Date(e.created_at).toLocaleString()},${e.product_code},${e.product_name || ''},${e.quantity},${e.user_id}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "balanco_geral.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleExportTxt = () => {
    // Format: code;quantity
    const txtContent = logs.map(e => `${e.product_code};${e.quantity}`).join("\n");
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "balanco_exportacao.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleExportPending = () => {
    // Filter only products flagged for correction
    const pendingLogs = logs.filter(e => e.needs_correction === true);

    if (pendingLogs.length === 0) {
      alert('Nenhum produto pendente de correção encontrado.');
      return;
    }

    // Format: code;quantity;name (include name for correction reference)
    const txtContent = pendingLogs.map(e =>
      `${e.product_code};${e.quantity};${e.product_name || 'SEM NOME'}`
    ).join("\n");

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.download = `pendentes_correcao_${date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/cnr_logo.jpg" alt="Logo CNR" style={{ height: '60px' }} />
          <div>
            <h1 style={{ fontSize: '24px', color: '#0056b3', margin: 0 }}>Painel Gerencial</h1>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              Total: <b>{stats.total}</b> |
              <span style={{ color: 'green' }}> Já Editados: <b>{stats.counted}</b></span> |
              <span style={{ color: 'red' }}> Faltam: <b>{stats.total - stats.counted}</b></span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportCsv}
            style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            CSV (Excel)
          </button>
          <button
            onClick={handleExportTxt}
            style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            📄 Exportar TXT
          </button>
          <button
            onClick={handleExportPending}
            style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ⚠️ Exportar Pendentes
          </button>
        </div>
      </header>

      {/* Action Bar (Import & Search) */}
      <div style={{ backgroundColor: '#fff', padding: '15px 30px', borderBottom: '1px solid #eee', display: 'flex', gap: '20px', alignItems: 'center' }}>
        {/* Import */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', color: '#333' }}>Importar Produtos (Excel):</label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={importing}
          />
          {importing && <span style={{ color: 'blue' }}>Importando... aguarde...</span>}
        </div>

        {/* Clear Database */}
        <button
          onClick={async () => {
            if (confirm("ATENÇÃO: Isso vai apagar TODOS os produtos importados da base. Tem certeza?")) {
              setImporting(true);
              const { error } = await supabase.from('products_base').delete().neq('id', 0);
              if (error) alert("Erro ao limpar: " + error.message);
              else {
                alert("Base limpa com sucesso!");
                setSearchResult([]);
                setSearchTerm("");
              }
              setImporting(false);
            }
          }}
          style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          disabled={importing}
        >
          🗑️ Limpar Base
        </button>

        {/* Search */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '30px' }}>
          <label style={{ fontWeight: 'bold' }}>🔍 Buscar na Base:</label>
          <input
            type="text"
            placeholder="Digite nome, EAN ou código..."
            value={searchTerm}
            onChange={e => handleSearchProduct(e.target.value)}
            style={{ padding: '8px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      {/* Search Results Area */}
      {searchResult.length > 0 && (
        <div style={{ padding: '0 30px', background: '#fff' }}>
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '10px', borderRadius: '4px' }}>
            <strong>Resultados da Busca na Base:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              {searchResult.map(p => (
                <li key={p.id} style={{
                  color: p.current_quantity > 0 ? 'green' : 'black',
                  fontWeight: p.current_quantity > 0 ? 'bold' : 'normal'
                }}>
                  {p.current_quantity > 0 && "✅ "}
                  <b>{p.description}</b> - EAN: {p.ean} - Cód: {p.internal_code}
                  {p.current_quantity > 0 && ` (Qtd: ${p.current_quantity})`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ padding: '0', width: '100%' }}>
        <div style={{ backgroundColor: 'white', minHeight: 'calc(100vh - 90px)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', padding: '20px' }}>
          <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Registro de Leituras</h2>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Acompanhe em tempo real os produtos adicionados.</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando dados...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', color: '#495057', fontSize: '14px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '15px' }}>📅 Data/Hora</th>
                    <th style={{ padding: '15px' }}>📝 Código</th>
                    <th style={{ padding: '15px' }}>📦 Produto</th>
                    <th style={{ padding: '15px' }}>🔢 Qtd</th>
                    <th style={{ padding: '15px' }}>👤 Usuário</th>
                    <th style={{ padding: '15px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fbff'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '12px 15px', color: '#666' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ padding: '12px 15px', fontWeight: '500', color: '#333' }}>{log.product_code}</td>
                      <td style={{ padding: '12px 15px', color: '#555' }}>{log.product_name || '-'}</td>
                      <td style={{ padding: '12px 15px' }}>
                        <span style={{ backgroundColor: '#e1f5fe', color: '#0288d1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                          {log.quantity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 15px', fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                        {log.user_email || log.user_id}
                      </td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleEditClick(log)}
                          style={{ marginRight: '10px', background: 'none', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteClick(log.id)}
                          style={{ background: 'none', border: '1px solid #ffcccc', color: 'red', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Nenhum registro encontrado ainda.</div>
              )}
            </div>
          )}
        </div>
      </main >

      {/* Edit Modal (Simple Inline Style) */}
      {editLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '300px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Editar Quantidade</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>Produto: {editLog.product_code}</p>
            <input
              type="number"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              style={{ width: '100%', padding: '8px', fontSize: '16px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setEditLog(null)} style={{ padding: '8px 15px', border: 'none', background: '#eee', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveEdit} style={{ padding: '8px 15px', border: 'none', background: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
