import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface Log {
  id: number;
  created_at: string;
  product_code: string;
  quantity: number;
  product_name: string | null;
  user_id: string;
  user_email?: string;
}

export default function App() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();

    // Realtime subscription
    const channel = supabase
      .channel('table_db_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_logs' }, (payload) => {
        setLogs((prev) => [payload.new as Log, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/cnr_logo.jpg" alt="Logo CNR" style={{ height: '60px' }} />
          <h1 style={{ fontSize: '24px', color: '#0056b3', margin: 0 }}>Painel Gerencial</h1>
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
        </div>
      </header>

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
    </div >
  );
}
