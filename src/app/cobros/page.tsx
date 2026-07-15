"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../lib/supabase";
import ReciboPago from "../components/ReciboPago";

type Cliente = {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  phone_primary: string;
};

type MonedaPrestamo = {
  code: string;
  symbol: string;
};

type ClientePrestamo = {
  first_name: string;
  last_name: string;
};

type Prestamo = {
  id: string;
  loan_number: string;
  client_id: string;
  principal_amount: number;
  principal_balance: number;
  interest_balance: number;
  late_fee_balance: number;
  interest_rate: number;
  interest_frequency: string;
  status: string;
  due_date: string | null;
  clients: ClientePrestamo | null;
  currencies: MonedaPrestamo | null;
};

type Pago = {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  late_fee_amount: number;
  payment_method: string;
  affects_cash: boolean;
  status: string;
  loans: {
    loan_number: string;
    clients: ClientePrestamo | null;
    currencies: MonedaPrestamo | null;
  } | null;
};

type FormularioPago = {
  amount: string;
  interest_amount: string;
  principal_amount: string;
  late_fee_amount: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  affects_cash: boolean;
};

const formularioInicial: FormularioPago = {
  amount: "",
  interest_amount: "0",
  principal_amount: "0",
  late_fee_amount: "0",
  payment_method: "cash",
  reference_number: "",
  notes: "",
  affects_cash: true,
};

export default function CobrosPage() {
  const searchParams = useSearchParams();
  const loanIdDesdeUrl = searchParams.get("loanId");
    
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ultimoPago, setUltimoPago] = useState<Pago | null>(null);

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [prestamoSeleccionado, setPrestamoSeleccionado] =
    useState<Prestamo | null>(null);

  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [formulario, setFormulario] =
    useState<FormularioPago>(formularioInicial);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [ultimoRecibo, setUltimoRecibo] = useState("");

  const cargarDatos = useCallback(
    async function cargarDatosDesdeSupabase() {
      setCargando(true);
      setMensajeError("");

      const resultadoClientes = await supabase
        .from("clients")
        .select(
          "id, first_name, last_name, document_number, phone_primary",
        )
        .eq("status", "active")
        .order("first_name", { ascending: true });

      const resultadoPrestamos = await supabase
        .from("loans")
        .select(
          "id, loan_number, client_id, principal_amount, principal_balance, interest_balance, late_fee_balance, interest_rate, interest_frequency, status, due_date, clients(first_name, last_name), currencies(code, symbol)",
        )
        .in("status", ["active", "overdue"])
        .order("created_at", { ascending: false });

      const resultadoPagos = await supabase
        .from("loan_payments")
        .select(
          "id, payment_number, payment_date, amount, principal_amount, interest_amount, late_fee_amount, payment_method, affects_cash, status, loans(loan_number, clients(first_name, last_name), currencies(code, symbol))",
        )
        .order("payment_date", { ascending: false })
        .limit(50);

      if (resultadoClientes.error) {
        setMensajeError(
          "No se pudieron cargar los clientes: " +
            resultadoClientes.error.message,
        );
        setClientes([]);
      } else {
        setClientes((resultadoClientes.data || []) as Cliente[]);
      }

      if (resultadoPrestamos.error) {
        setMensajeError(
          "No se pudieron cargar los préstamos: " +
            resultadoPrestamos.error.message,
        );
        setPrestamos([]);
      } else {
        setPrestamos(
          (resultadoPrestamos.data || []) as unknown as Prestamo[],
        );
      }

      if (resultadoPagos.error) {
        setMensajeError(
          "No se pudo cargar el historial de cobros: " +
            resultadoPagos.error.message,
        );
        setPagos([]);
      } else {
        setPagos((resultadoPagos.data || []) as unknown as Pago[]);
      }

      setCargando(false);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrirPagina() {
      void cargarDatos();
    },
    [cargarDatos],
  );

  useEffect(
    function seleccionarPrestamoDesdeUrl() {
      if (!loanIdDesdeUrl || cargando) {
        return;
      }
  
      const prestamoEncontrado =
        prestamos.find(function encontrarPrestamo(prestamo) {
          return prestamo.id === loanIdDesdeUrl;
        }) || null;
  
      if (!prestamoEncontrado) {
        setMensajeError(
          "No se encontró el préstamo indicado en la dirección.",
        );
        return;
      }
  
      const clienteEncontrado =
        clientes.find(function encontrarCliente(cliente) {
          return cliente.id === prestamoEncontrado.client_id;
        }) || null;
  
      setPrestamoSeleccionado(prestamoEncontrado);
      setClienteSeleccionado(clienteEncontrado);
      setModalPagoAbierto(true);
    },
    [loanIdDesdeUrl, cargando, prestamos, clientes],
  );

  const clientesFiltrados = useMemo(
    function filtrarClientes() {
      const termino = busquedaCliente.trim().toLowerCase();

      if (termino === "") {
        return clientes.slice(0, 10);
      }

      return clientes
        .filter(function coincide(cliente) {
          const nombreCompleto = (
            cliente.first_name +
            " " +
            cliente.last_name
          ).toLowerCase();

          return (
            nombreCompleto.includes(termino) ||
            cliente.document_number.toLowerCase().includes(termino) ||
            cliente.phone_primary.toLowerCase().includes(termino)
          );
        })
        .slice(0, 10);
    },
    [busquedaCliente, clientes],
  );

  const prestamosDelCliente = useMemo(
    function filtrarPrestamosCliente() {
      if (!clienteSeleccionado) {
        return [];
      }

      return prestamos.filter(function perteneceAlCliente(prestamo) {
        return prestamo.client_id === clienteSeleccionado.id;
      });
    },
    [clienteSeleccionado, prestamos],
  );

  const totalPendiente = useMemo(
    function calcularTotalPendiente() {
      if (!prestamoSeleccionado) {
        return 0;
      }

      return (
        Number(prestamoSeleccionado.principal_balance) +
        Number(prestamoSeleccionado.interest_balance) +
        Number(prestamoSeleccionado.late_fee_balance)
      );
    },
    [prestamoSeleccionado],
  );

  function seleccionarCliente(cliente: Cliente) {
    setClienteSeleccionado(cliente);
    setPrestamoSeleccionado(null);
    setBusquedaCliente(
      cliente.first_name + " " + cliente.last_name,
    );
    setMensajeError("");
    setMensajeExito("");
  }

  function abrirFormularioPago(prestamo: Prestamo) {
    setPrestamoSeleccionado(prestamo);

    setFormulario({
      ...formularioInicial,
      interest_amount: String(
        Number(prestamo.interest_balance).toFixed(2),
      ),
      late_fee_amount: String(
        Number(prestamo.late_fee_balance).toFixed(2),
      ),
    });

    setMensajeError("");
    setMensajeExito("");
    setUltimoRecibo("");
    setModalPagoAbierto(true);
  }

  function cerrarFormularioPago() {
    if (!guardando) {
      setModalPagoAbierto(false);
      setFormulario(formularioInicial);
    }
  }

  function calcularDistribucionSugerida(valorMonto: string) {
    if (!prestamoSeleccionado) {
      return;
    }

    const monto = Number(valorMonto);

    if (!Number.isFinite(monto) || monto <= 0) {
      setFormulario({
        ...formulario,
        amount: valorMonto,
        interest_amount: "0",
        principal_amount: "0",
        late_fee_amount: "0",
      });

      return;
    }

    let restante = monto;

    const moraPendiente = Number(
      prestamoSeleccionado.late_fee_balance,
    );
    const interesPendiente = Number(
      prestamoSeleccionado.interest_balance,
    );
    const capitalPendiente = Number(
      prestamoSeleccionado.principal_balance,
    );

    const pagoMora = Math.min(restante, moraPendiente);
    restante = restante - pagoMora;

    const pagoInteres = Math.min(restante, interesPendiente);
    restante = restante - pagoInteres;

    const pagoCapital = Math.min(restante, capitalPendiente);

    setFormulario({
      ...formulario,
      amount: valorMonto,
      late_fee_amount: pagoMora.toFixed(2),
      interest_amount: pagoInteres.toFixed(2),
      principal_amount: pagoCapital.toFixed(2),
    });
  }

  async function registrarPago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!prestamoSeleccionado) {
      setMensajeError("Debes seleccionar un préstamo.");
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setMensajeExito("");
    setUltimoRecibo("");

    const monto = Number(formulario.amount);
    const interes = Number(formulario.interest_amount);
    const capital = Number(formulario.principal_amount);
    const mora = Number(formulario.late_fee_amount);

    if (!Number.isFinite(monto) || monto <= 0) {
      setMensajeError(
        "El monto recibido debe ser mayor que cero.",
      );
      setGuardando(false);
      return;
    }

    if (
      interes < 0 ||
      capital < 0 ||
      mora < 0
    ) {
      setMensajeError(
        "Los valores distribuidos no pueden ser negativos.",
      );
      setGuardando(false);
      return;
    }

    const totalDistribuido = interes + capital + mora;

    if (totalDistribuido > monto) {
      setMensajeError(
        "La suma de interés, capital y mora no puede superar el monto recibido.",
      );
      setGuardando(false);
      return;
    }

    if (monto > totalPendiente) {
      setMensajeError(
        "El monto recibido supera el balance total pendiente.",
      );
      setGuardando(false);
      return;
    }

    const resultado = await supabase.rpc(
      "register_loan_payment",
      {
        p_loan_id: prestamoSeleccionado.id,
        p_amount: monto,
        p_interest_amount: interes,
        p_principal_amount: capital,
        p_late_fee_amount: mora,
        p_payment_method: formulario.payment_method,
        p_reference_number:
          formulario.reference_number.trim() || null,
        p_notes: formulario.notes.trim() || null,
        p_affects_cash: formulario.affects_cash,
      },
    );

    if (resultado.error) {
      setMensajeError(
        "No se pudo registrar el pago: " +
          resultado.error.message,
      );
      setGuardando(false);
      return;
    }

    const datosResultado = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    const numeroRecibo =
      datosResultado &&
      typeof datosResultado.payment_number === "string"
        ? datosResultado.payment_number
        : "";
    
    setUltimoRecibo(numeroRecibo);
    
    setUltimoPago({
      id:
        datosResultado &&
        typeof datosResultado.payment_id === "string"
          ? datosResultado.payment_id
          : "",
      payment_number: numeroRecibo,
      payment_date: new Date().toISOString(),
      amount: monto,
      principal_amount: capital,
      interest_amount: interes,
      late_fee_amount: mora,
      payment_method: formulario.payment_method,
      affects_cash: formulario.affects_cash,
      status: "posted",
      loans: {
        loan_number: prestamoSeleccionado.loan_number,
        clients: prestamoSeleccionado.clients || null,
        currencies: prestamoSeleccionado.currencies || null,
      },
    } as Pago);
    
    setMensajeExito("Pago registrado correctamente.");
    setFormulario(formularioInicial);

    await cargarDatos();

    setModalPagoAbierto(false);
    setPrestamoSeleccionado(null);
    setGuardando(false);
  }

  function obtenerTextoFrecuencia(frecuencia: string) {
    if (frecuencia === "weekly") {
      return "Semanal";
    }

    if (frecuencia === "biweekly") {
      return "Quincenal";
    }

    return "Mensual";
  }

  function obtenerTextoMetodo(metodo: string) {
    if (metodo === "cash") return "Efectivo";
    if (metodo === "transfer") return "Transferencia";
    if (metodo === "deposit") return "Depósito";
    if (metodo === "check") return "Cheque";
    if (metodo === "card_withdrawal") {
      return "Retiro con tarjeta";
    }

    

    return "Otro";
  }

  function imprimirRecibo() {
    const recibo = document.querySelector(".print-area");
  
    if (!recibo) {
      window.alert("No se encontró el recibo para imprimir.");
      return;
    }
  
    const ventanaImpresion = window.open(
      "",
      "_blank",
      "width=700,height=800",
    );
  
    if (!ventanaImpresion) {
      window.alert(
        "El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo nuevamente.",
      );
      return;
    }
  
    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Recibo de pago</title>
  
          <style>
            * {
              box-sizing: border-box;
            }
  
            html,
            body {
              width: 80%;
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
              color: #171717;
            }
  
            .recibo {
                width: 80mm;
                margin: 0;
                padding: 4mm;
                background: white;
                font-size: 12px;
            }
  
            h1 {
              margin: 0;
              text-align: center;
              font-size: 18px;
            }
  
            p {
              margin: 4px 0;
              font-size: 12px;
            }
  
            hr {
              margin: 8px 0;
              border: 0;
              border-top: 1px dashed #000;
            }
  
            @page {
              size: 80mm auto;
              margin: 0;
            }
          </style>
        </head>
  
        <body>
          <div class="recibo">
            ${recibo.innerHTML}
          </div>
        </body>
      </html>
    `);
  
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
  
    ventanaImpresion.onload = function () {
      ventanaImpresion.print();
      ventanaImpresion.close();
    };
  }

  function formatearMonto(
    monto: number,
    moneda: MonedaPrestamo | null,
  ) {
    const simbolo = moneda ? moneda.symbol : "";

    return (
      simbolo +
      " " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-4xl font-bold text-blue-900">
            Cobros
          </h1>

          <p className="mt-2 text-gray-600">
            Busca al cliente, selecciona su préstamo y registra
            el pago
          </p>
        </div>

        {mensajeError !== "" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensajeError}
          </div>
        )}

{mensajeExito !== "" && (
  <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
    <p className="font-semibold">{mensajeExito}</p>

    {ultimoRecibo !== "" && (
      <>
        <p className="mt-1">
          Número de recibo: {ultimoRecibo}
        </p>

        <button
          type="button"
          onClick={imprimirRecibo}
          className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        >
          Imprimir recibo
        </button>

        {ultimoPago !== null && (
          <div className="mt-4">
            <ReciboPago
              numeroRecibo={ultimoPago.payment_number}
              cliente={
                ultimoPago.loans?.clients
                  ? ultimoPago.loans.clients.first_name +
                    " " +
                    ultimoPago.loans.clients.last_name
                  : "Cliente no disponible"
              }
              prestamo={
                ultimoPago.loans?.loan_number ??
                "Préstamo no disponible"
              }
              fecha={new Date(
                ultimoPago.payment_date,
              ).toLocaleString("es-DO")}
              monto={Number(ultimoPago.amount)}
              capital={Number(ultimoPago.principal_amount)}
              interes={Number(ultimoPago.interest_amount)}
              mora={Number(ultimoPago.late_fee_amount)}
              metodo={obtenerTextoMetodo(
                ultimoPago.payment_method,
              )}
            />
          </div>
        )}
      </>
    )}
  </div>
)}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            1. Buscar cliente
          </h2>

          <label
            htmlFor="buscar-cliente"
            className="mt-5 block text-sm font-medium text-gray-700"
          >
            Nombre, cédula o teléfono
          </label>

          <input
            id="buscar-cliente"
            type="search"
            value={busquedaCliente}
            onChange={function actualizarBusqueda(event) {
              setBusquedaCliente(event.target.value);
              setClienteSeleccionado(null);
              setPrestamoSeleccionado(null);
            }}
            placeholder="Escribe para buscar..."
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
          />

          {busquedaCliente.trim() !== "" &&
            !clienteSeleccionado && (
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                {clientesFiltrados.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">
                    No se encontraron clientes.
                  </p>
                ) : (
                  clientesFiltrados.map(function mostrarCliente(
                    cliente,
                  ) {
                    return (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={function elegirCliente() {
                          seleccionarCliente(cliente);
                        }}
                        className="flex w-full flex-col border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                      >
                        <span className="font-medium text-gray-900">
                          {cliente.first_name}{" "}
                          {cliente.last_name}
                        </span>

                        <span className="mt-1 text-sm text-gray-500">
                          {cliente.document_number} ·{" "}
                          {cliente.phone_primary}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
        </section>

        {clienteSeleccionado && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-blue-900">
                  2. Préstamos del cliente
                </h2>

                <p className="mt-1 text-gray-600">
                  {clienteSeleccionado.first_name}{" "}
                  {clienteSeleccionado.last_name}
                </p>
              </div>

              <button
                type="button"
                onClick={function cambiarCliente() {
                  setClienteSeleccionado(null);
                  setPrestamoSeleccionado(null);
                  setBusquedaCliente("");
                }}
                className="text-sm font-medium text-blue-900 hover:text-blue-700"
              >
                Cambiar cliente
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Préstamo
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Capital
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Interés
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Mora
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Total
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {cargando ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Cargando préstamos...
                      </td>
                    </tr>
                  ) : prestamosDelCliente.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Este cliente no tiene préstamos activos.
                      </td>
                    </tr>
                  ) : (
                    prestamosDelCliente.map(
                      function mostrarPrestamo(prestamo) {
                        const total =
                          Number(prestamo.principal_balance) +
                          Number(prestamo.interest_balance) +
                          Number(prestamo.late_fee_balance);

                        return (
                          <tr key={prestamo.id}>
                            <td className="whitespace-nowrap px-4 py-4 text-sm">
                              <p className="font-medium text-blue-900">
                                {prestamo.loan_number}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {obtenerTextoFrecuencia(
                                  prestamo.interest_frequency,
                                )}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                              {formatearMonto(
                                prestamo.principal_balance,
                                prestamo.currencies,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                              {formatearMonto(
                                prestamo.interest_balance,
                                prestamo.currencies,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                              {formatearMonto(
                                prestamo.late_fee_balance,
                                prestamo.currencies,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                              {formatearMonto(
                                total,
                                prestamo.currencies,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm">
                              <button
                                type="button"
                                onClick={function cobrarPrestamo() {
                                  abrirFormularioPago(prestamo);
                                }}
                                className="rounded-lg bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800"
                              >
                                Registrar pago
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Historial reciente de cobros
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Recibo
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Cliente
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Préstamo
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Monto
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Método
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Caja
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Fecha
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Cargando cobros...
                    </td>
                  </tr>
                ) : pagos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Todavía no hay pagos registrados.
                    </td>
                  </tr>
                ) : (
                  pagos.map(function mostrarPago(pago) {
                    const moneda =
                      pago.loans &&
                      pago.loans.currencies
                        ? pago.loans.currencies
                        : null;

                    const cliente =
                      pago.loans &&
                      pago.loans.clients
                        ? pago.loans.clients
                        : null;

                    return (
                      <tr key={pago.id}>
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-blue-900">
                          {pago.payment_number}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                          {cliente
                            ? cliente.first_name +
                              " " +
                              cliente.last_name
                            : "Sin cliente"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                          {pago.loans
                            ? pago.loans.loan_number
                            : "Sin préstamo"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                          {formatearMonto(
                            pago.amount,
                            moneda,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                          {obtenerTextoMetodo(
                            pago.payment_method,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                          {pago.affects_cash ? "Sí" : "No"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                          {formatearFecha(
                            pago.payment_date,
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalPagoAbierto && prestamoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Registrar pago
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {prestamoSeleccionado.loan_number}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarFormularioPago}
                className="text-2xl text-gray-500 hover:text-gray-900"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Capital
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatearMonto(
                    prestamoSeleccionado.principal_balance,
                    prestamoSeleccionado.currencies,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Interés
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatearMonto(
                    prestamoSeleccionado.interest_balance,
                    prestamoSeleccionado.currencies,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Mora
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatearMonto(
                    prestamoSeleccionado.late_fee_balance,
                    prestamoSeleccionado.currencies,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500">
                  Total
                </p>

                <p className="mt-1 font-bold text-blue-900">
                  {formatearMonto(
                    totalPendiente,
                    prestamoSeleccionado.currencies,
                  )}
                </p>
              </div>
            </div>

            <form
              onSubmit={registrarPago}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Monto recibido
                </label>

                <input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={totalPendiente}
                  value={formulario.amount}
                  onChange={function actualizarMonto(event) {
                    calcularDistribucionSugerida(
                      event.target.value,
                    );
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />

                <p className="mt-1 text-xs text-gray-500">
                  La distribución se sugiere automáticamente:
                  primero mora, después interés y luego capital.
                  Puedes modificarla.
                </p>
              </div>

              <div>
                <label
                  htmlFor="late_fee_amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Aplicar a mora
                </label>

                <input
                  id="late_fee_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.late_fee_amount}
                  onChange={function actualizarMora(event) {
                    setFormulario({
                      ...formulario,
                      late_fee_amount: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="interest_amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Aplicar a interés
                </label>

                <input
                  id="interest_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.interest_amount}
                  onChange={function actualizarInteres(event) {
                    setFormulario({
                      ...formulario,
                      interest_amount: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="principal_amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Aplicar a capital
                </label>

                <input
                   id="principal_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.principal_amount}
                  onChange={function actualizarCapital(event) {
                    setFormulario({
                      ...formulario,
                      principal_amount: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="payment_method"
                  className="block text-sm font-medium text-gray-700"
                >
                  Forma de pago
                </label>

                <select
                  id="payment_method"
                  value={formulario.payment_method}
                  onChange={function actualizarMetodo(event) {
                    setFormulario({
                      ...formulario,
                      payment_method: event.target.value,
                    });
                  }}

                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">
                    Transferencia
                  </option>
                  <option value="deposit">Depósito</option>
                  <option value="check">Cheque</option>
                  <option value="card_withdrawal">
                    Retiro con tarjeta
                  </option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="reference_number"
                  className="block text-sm font-medium text-gray-700"
                >
                  Número de referencia
                </label>

                <input
                  id="reference_number"
                  type="text"
                  value={formulario.reference_number}
                  onChange={function actualizarReferencia(event) {
                    setFormulario({
                      ...formulario,
                      reference_number: event.target.value,
                    });
                  }}
                  placeholder="Opcional"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                />
              </div>

              <div className="flex items-center sm:col-span-2">
                <input
                  id="affects_cash"
                  type="checkbox"
                  checked={formulario.affects_cash}
                  onChange={function actualizarCaja(event) {
                    setFormulario({
                      ...formulario,
                      affects_cash: event.target.checked,
                    });
                  }}
                  className="h-4 w-4"
                />

                <label
                  htmlFor="affects_cash"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  Este pago entra a la caja del día
                </label>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Observaciones
                </label>

                <textarea
                  id="notes"
                  rows={3}
                  value={formulario.notes}
                  onChange={function actualizarNotas(event) {
                    setFormulario({
                      ...formulario,
                      notes: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={cerrarFormularioPago}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando
                    ? "Registrando..."
                    : "Registrar pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}