type Props = {
    numeroRecibo: string;
    cliente: string;
    prestamo: string;
    fecha: string;
    monto: number;
    capital: number;
    interes: number;
    mora: number;
    metodo: string;
  };
  
  export default function ReciboPago({
    numeroRecibo,
    cliente,
    prestamo,
    fecha,
    monto,
    capital,
    interes,
    mora,
    metodo,
  }: Props) {
    return (
<div className="print-area mx-auto mt-20 w-[380px] rounded-xl border bg-white p-8 shadow-lg">        <h1 className="text-center text-2xl font-bold">
          MattFinance ERP
        </h1>
  
        <hr className="my-4" />
  
        <p>
          <strong>Recibo:</strong> {numeroRecibo}
        </p>
  
        <p>
          <strong>Cliente:</strong> {cliente}
        </p>
  
        <p>
          <strong>Préstamo:</strong> {prestamo}
        </p>
  
        <p>
          <strong>Fecha:</strong> {fecha}
        </p>
  
        <hr className="my-4" />
  
        <p>
          <strong>Monto:</strong> RD$ {monto.toFixed(2)}
        </p>
  
        <p>
          <strong>Capital:</strong> RD$ {capital.toFixed(2)}
        </p>
  
        <p>
          <strong>Interés:</strong> RD$ {interes.toFixed(2)}
        </p>
  
        <p>
          <strong>Mora:</strong> RD$ {mora.toFixed(2)}
        </p>
  
        <p>
          <strong>Método:</strong> {metodo}
        </p>
  
        <hr className="my-4" />
  
        <p className="text-center">
          Gracias por su pago
        </p>
      </div>
    );
  }