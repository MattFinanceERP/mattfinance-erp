export default function DashboardPage() {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <h1 className="text-4xl font-bold text-blue-900">
          MattFinance ERP
        </h1>
  
        <p className="text-gray-600 mt-2">
          Dashboard Principal
        </p>
  
        <div className="grid grid-cols-4 gap-4 mt-10">
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">💰 Caja General</h2>
            <p className="text-3xl font-bold mt-3">
              RD$ 0.00
            </p>
          </div>
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">💵 USD</h2>
            <p className="text-3xl font-bold mt-3">
              US$ 0.00
            </p>
          </div>
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">💶 EUR</h2>
            <p className="text-3xl font-bold mt-3">
              € 0.00
            </p>
          </div>
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">💷 GBP</h2>
            <p className="text-3xl font-bold mt-3">
              £ 0.00
            </p>
          </div>
  
        </div>
  
        <div className="grid grid-cols-4 gap-4 mt-6">
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">👥 Clientes</h2>
            <p className="text-3xl font-bold mt-3">0</p>
          </div>
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">💳 Préstamos</h2>
            <p className="text-3xl font-bold mt-3">0</p>
          </div>
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">💱 Cambios</h2>
            <p className="text-3xl font-bold mt-3">0</p>
          </div>
  
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-gray-500">📈 Flujo de Caja</h2>
            <p className="text-3xl font-bold mt-3">
              RD$ 0.00
            </p>
          </div>
  
        </div>
      </main>
    );
  }