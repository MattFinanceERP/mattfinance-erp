"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../lib/supabase";

type Moneda = {
  id: string;
  code: string;
  symbol: string;
};

type ChequePorCobrar = {
  id: string;
  organization_id: string;
  currency_id: string;
  internal_reference: string;
  bank: string;
  other_bank: string | null;
  check_number: string;
  drawer_name: string | null;
  beneficiary_name: string | null;
  check_date: string | null;
  due_date: string | null;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status:
    | "pending"
    | "deposited"
    | "collected"
    | "returned"
    | "cancelled";
  deposited_at: string | null;
  collected_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  currencies: Moneda | null;
};

type FiltroEstado =
  | "all"
  | "pending"
  | "deposited"
  | "collected"
  | "returned"
  | "cancelled";

export default function ChequesPage() {
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const [cheques, setCheques] = useState<ChequePorCobrar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("all");
  const [chequeSeleccionado, setChequeSeleccionado] =
    useState<ChequePorCobrar | null>(null);

  const cargarCheques = useCallback(
    async function cargarDesdeSupabase() {
      setCargando(true);
      setMensajeError("");

      const resultado = await supabase
        .from("checks_receivable")
        .select(
          "id, organization_id, currency_id, internal_reference, bank, other_bank, check_number, drawer_name, beneficiary_name, check_date, due_date, gross_amount, commission_rate, commission_amount, net_amount, status, deposited_at, collected_at, returned_at, return_reason, notes, created_at, updated_at, currencies(id, code, symbol)",
        )
        .order("created_at", { ascending: false });

      if (resultado.error) {
        setMensajeError(
          "No se pudieron cargar los cheques: " +
            resultado.error.message,
        );
        setCheques([]);
      } else {
        setCheques(
          (resultado.data || []) as unknown as ChequePorCobrar[],
        );
      }

      setCargando(false);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrir() {
      void cargarCheques();
    },
    [cargarCheques],
  );

  const chequesFiltrados = useMemo(
    function filtrarCheques() {
      const texto = busqueda.trim().toLowerCase();

      return cheques.filter(function coincide(cheque) {
        const coincideEstado =
          filtroEstado === "all" ||
          cheque.status === filtroEstado;

        const banco = obtenerTextoBanco(
          cheque.bank,
          cheque.other_bank,
        ).toLowerCase();

        const coincideBusqueda =
          texto === "" ||
          cheque.internal_reference.toLowerCase().includes(texto) ||
          cheque.check_number.toLowerCase().includes(texto) ||
          banco.includes(texto) ||
          (cheque.drawer_name || "")
            .toLowerCase()
            .includes(texto) ||
          (cheque.beneficiary_name || "")
            .toLowerCase()
            .includes(texto);

        return coincideEstado && coincideBusqueda;
      });
    },
    [cheques, filtroEstado, busqueda],
  );

  const resumen = useMemo(
    function calcularResumen() {
      const pendientes = cheques.filter(
        (cheque) => cheque.status === "pending",
      );
      const depositados = cheques.filter(
        (cheque) => cheque.status === "deposited",
      );
      const cobrados = cheques.filter(
        (cheque) => cheque.status === "collected",
      );
      const devueltos = cheques.filter(
        (cheque) => cheque.status === "returned",
      );

      return {
        pendientesCantidad: pendientes.length,
        pendientesMonto: sumarMonto(pendientes),
        depositadosCantidad: depositados.length,
        depositadosMonto: sumarMonto(depositados),
        cobradosCantidad: cobrados.length,
        cobradosMonto: sumarMonto(cobrados),
        devueltosCantidad: devueltos.length,
        devueltosMonto: sumarMonto(devueltos),
        comisiones: cheques.reduce(function sumar(total, cheque) {
          return total + Number(cheque.commission_amount);
        }, 0),
      };
    },
    [cheques],
  );

  async function marcarDepositado(cheque: ChequePorCobrar) {
    await actualizarEstadoCheque(
      cheque,
      "deposited",
      {
        deposited_at: new Date().toISOString(),
        collected_at: null,
        returned_at: null,
        return_reason: null,
      },
      "Cheque marcado como depositado.",
    );
  }

  async function marcarCobrado(cheque: ChequePorCobrar) {
    const confirmar = window.confirm(
      "¿Confirmas que el banco pagó este cheque? Se registrará una entrada en Caja por el monto completo.",
    );

    if (!confirmar) return;

    setProcesandoId(cheque.id);
    setMensajeError("");
    setMensajeExito("");

    const fecha = new Date().toISOString();

    const resultadoMovimiento = await supabase
      .from("cash_movements")
      .insert({
        organization_id: cheque.organization_id,
        currency_id: cheque.currency_id,
        movement_date: fecha,
        movement_type: "check_exchange",
        direction: "income",
        amount: Number(cheque.gross_amount),
        source_type: "check_receivable_collected",
        source_id: cheque.id,
        reference_number: cheque.internal_reference,
        description:
          `Cobro del cheque No. ${cheque.check_number} de ${obtenerTextoBanco(
            cheque.bank,
            cheque.other_bank,
          )}.`,
        payment_method: "check",
        status: "posted",
      });

    if (resultadoMovimiento.error) {
      setMensajeError(
        "No se pudo registrar la entrada en Caja: " +
          resultadoMovimiento.error.message,
      );
      setProcesandoId("");
      return;
    }

    const resultadoCheque = await supabase
      .from("checks_receivable")
      .update({
        status: "collected",
        collected_at: fecha,
        returned_at: null,
        return_reason: null,
        updated_at: fecha,
      })
      .eq("id", cheque.id);

    if (resultadoCheque.error) {
      setMensajeError(
        "La entrada se registró en Caja, pero no se pudo actualizar el cheque. Revisa este cheque antes de repetir la operación: " +
          resultadoCheque.error.message,
      );
      setProcesandoId("");
      return;
    }

    await cargarCheques();
    setMensajeExito(
      "Cheque cobrado correctamente y entrada registrada en Caja.",
    );
    setProcesandoId("");
  }

  async function marcarDevuelto(cheque: ChequePorCobrar) {
    const motivo = window.prompt(
      "Escribe el motivo de devolución del cheque:",
    );

    if (motivo === null) return;

    if (motivo.trim() === "") {
      setMensajeError(
        "Debes escribir el motivo de devolución.",
      );
      return;
    }

    await actualizarEstadoCheque(
      cheque,
      "returned",
      {
        returned_at: new Date().toISOString(),
        return_reason: motivo.trim(),
      },
      "Cheque marcado como devuelto.",
    );
  }

  async function marcarCancelado(cheque: ChequePorCobrar) {
    const confirmar = window.confirm(
      "¿Seguro que deseas cancelar este cheque?",
    );

    if (!confirmar) return;

    await actualizarEstadoCheque(
      cheque,
      "cancelled",
      {},
      "Cheque cancelado.",
    );
  }

  async function actualizarEstadoCheque(
    cheque: ChequePorCobrar,
    estado:
      | "deposited"
      | "returned"
      | "cancelled",
    camposExtra: Record<string, string | null>,
    mensaje: string,
  ) {
    setProcesandoId(cheque.id);
    setMensajeError("");
    setMensajeExito("");

    const resultado = await supabase
      .from("checks_receivable")
      .update({
        status: estado,
        updated_at: new Date().toISOString(),
        ...camposExtra,
      })
      .eq("id", cheque.id);

    if (resultado.error) {
      setMensajeError(
        "No se pudo actualizar el cheque: " +
          resultado.error.message,
      );
      setProcesandoId("");
      return;
    }

    await cargarCheques();
    setMensajeExito(mensaje);
    setProcesandoId("");
  }

  function formatearMonto(
    monto: number,
    moneda: Moneda | null,
  ) {
    const simbolo = moneda?.symbol || "RD$";

    return (
      simbolo +
      " " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatearFecha(fecha: string | null) {
    if (!fecha) return "—";

    return new Date(fecha).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function obtenerTextoEstado(estado: ChequePorCobrar["status"]) {
    if (estado === "pending") return "Pendiente";
    if (estado === "deposited") return "Depositado";
    if (estado === "collected") return "Cobrado";
    if (estado === "returned") return "Devuelto";
    return "Cancelado";
  }

  function obtenerClaseEstado(estado: ChequePorCobrar["status"]) {
    if (estado === "pending") {
      return "bg-amber-100 text-amber-800";
    }

    if (estado === "deposited") {
      return "bg-blue-100 text-blue-800";
    }

    if (estado === "collected") {
      return "bg-green-100 text-green-800";
    }

    if (estado === "returned") {
      return "bg-red-100 text-red-800";
    }

    return "bg-gray-200 text-gray-700";
  }


  function calcularDiasPendiente(cheque: ChequePorCobrar) {
    if (
      cheque.status === "collected" ||
      cheque.status === "cancelled"
    ) {
      return null;
    }

    const inicio = new Date(
      cheque.check_date || cheque.created_at,
    );
    const hoy = new Date();
    const diferencia = hoy.getTime() - inicio.getTime();

    return Math.max(
      0,
      Math.floor(diferencia / (1000 * 60 * 60 * 24)),
    );
  }

  function imprimirComprobante(cheque: ChequePorCobrar) {
    const ventana = window.open(
      "",
      "_blank",
      "width=760,height=850",
    );

    if (!ventana) {
      window.alert(
        "El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo otra vez.",
      );
      return;
    }

    const banco = obtenerTextoBanco(
      cheque.bank,
      cheque.other_bank,
    );
    const titular =
      cheque.drawer_name ||
      cheque.beneficiary_name ||
      "No indicado";

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Comprobante de cambio de cheque</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 18px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: white;
            }
            .recibo {
              width: 80mm;
              margin: 0 auto;
              font-size: 12px;
              line-height: 1.45;
            }
            h1 {
              margin: 0;
              text-align: center;
              font-size: 19px;
            }
            h2 {
              margin: 4px 0 14px;
              text-align: center;
              font-size: 13px;
            }
            .linea {
              border: 0;
              border-top: 1px solid #111827;
              margin: 12px 0;
            }
            p { margin: 5px 0; }
            .importe {
              display: flex;
              justify-content: space-between;
              gap: 12px;
            }
            .total {
              font-weight: 700;
              font-size: 14px;
            }
            .firma {
              margin-top: 34px;
              text-align: center;
            }
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
          </style>
        </head>
        <body>
          <div class="recibo">
            <h1>MattFinance ERP</h1>
            <h2>COMPROBANTE DE CAMBIO DE CHEQUE</h2>
            <hr class="linea" />
            <p><strong>Referencia:</strong> ${cheque.internal_reference}</p>
            <p><strong>Banco:</strong> ${banco}</p>
            <p><strong>Cheque:</strong> ${cheque.check_number}</p>
            <p><strong>Titular:</strong> ${titular}</p>
            <p><strong>Fecha:</strong> ${formatearFecha(
              cheque.check_date || cheque.created_at,
            )}</p>
            <p><strong>Estado:</strong> ${obtenerTextoEstado(
              cheque.status,
            )}</p>
            <hr class="linea" />
            <p class="importe">
              <span>Monto del cheque</span>
              <strong>${formatearMonto(
                cheque.gross_amount,
                cheque.currencies,
              )}</strong>
            </p>
            <p class="importe">
              <span>Comisión (${Number(
                cheque.commission_rate,
              ).toFixed(2)}%)</span>
              <strong>${formatearMonto(
                cheque.commission_amount,
                cheque.currencies,
              )}</strong>
            </p>
            <p class="importe total">
              <span>Efectivo entregado</span>
              <strong>${formatearMonto(
                cheque.net_amount,
                cheque.currencies,
              )}</strong>
            </p>
            <hr class="linea" />
            <p><strong>Observaciones:</strong> ${
              cheque.notes || "Ninguna"
            }</p>
            <div class="firma">
              _______________________________<br />
              Firma
            </div>
          </div>
        </body>
      </html>
    `);

    ventana.document.close();
    ventana.focus();

    ventana.onload = function imprimir() {
      ventana.print();
    };
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-4xl font-bold text-blue-900">
            Cheques por cobrar
          </h1>
          <p className="mt-2 text-gray-600">
            Administra cheques pendientes, depositados, cobrados y devueltos.
          </p>
        </div>

        {mensajeError !== "" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensajeError}
          </div>
        )}

        {mensajeExito !== "" && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {mensajeExito}
          </div>
        )}

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <TarjetaResumen
            titulo="Pendientes"
            cantidad={resumen.pendientesCantidad}
            monto={resumen.pendientesMonto}
          />
          <TarjetaResumen
            titulo="Depositados"
            cantidad={resumen.depositadosCantidad}
            monto={resumen.depositadosMonto}
          />
          <TarjetaResumen
            titulo="Cobrados"
            cantidad={resumen.cobradosCantidad}
            monto={resumen.cobradosMonto}
          />
          <TarjetaResumen
            titulo="Devueltos"
            cantidad={resumen.devueltosCantidad}
            monto={resumen.devueltosMonto}
          />
          <TarjetaResumen
            titulo="Comisiones"
            cantidad={cheques.length}
            monto={resumen.comisiones}
          />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Historial de cheques
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Busca por banco, número, titular o referencia.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                className="rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                placeholder="Buscar cheque..."
              />

              <select
                value={filtroEstado}
                onChange={(event) =>
                  setFiltroEstado(
                    event.target.value as FiltroEstado,
                  )
                }
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="deposited">Depositados</option>
                <option value="collected">Cobrados</option>
                <option value="returned">Devueltos</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Fecha",
                    "Banco",
                    "Cheque",
                    "Titular",
                    "Monto",
                    "Comisión",
                    "Neto",
                    "Estado",
                    "Acciones",
                  ].map((titulo) => (
                    <th
                      key={titulo}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Cargando cheques...
                    </td>
                  </tr>
                ) : chequesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No hay cheques para mostrar.
                    </td>
                  </tr>
                ) : (
                  chequesFiltrados.map((cheque) => (
                    <tr key={cheque.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearFecha(
                          cheque.check_date ||
                            cheque.created_at,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {obtenerTextoBanco(
                          cheque.bank,
                          cheque.other_bank,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {cheque.check_number}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {cheque.drawer_name ||
                          cheque.beneficiary_name ||
                          "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                        {formatearMonto(
                          cheque.gross_amount,
                          cheque.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-green-700">
                        {formatearMonto(
                          cheque.commission_amount,
                          cheque.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                        {formatearMonto(
                          cheque.net_amount,
                          cheque.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-xs font-medium " +
                            obtenerClaseEstado(cheque.status)
                          }
                        >
                          {obtenerTextoEstado(cheque.status)}
                        </span>
                      </td>
                      <td className="min-w-[280px] px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setChequeSeleccionado(cheque)
                            }
                            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Ver detalle
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              imprimirComprobante(cheque)
                            }
                            className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                          >
                            Imprimir
                          </button>

                          {cheque.status === "pending" && (
                            <button
                              type="button"
                              disabled={
                                procesandoId === cheque.id
                              }
                              onClick={() =>
                                void marcarDepositado(cheque)
                              }
                              className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                              Depositar
                            </button>
                          )}

                          {(cheque.status === "pending" ||
                            cheque.status === "deposited") && (
                            <button
                              type="button"
                              disabled={
                                procesandoId === cheque.id
                              }
                              onClick={() =>
                                void marcarCobrado(cheque)
                              }
                              className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                            >
                              Cobrado
                            </button>
                          )}

                          {(cheque.status === "pending" ||
                            cheque.status === "deposited") && (
                            <button
                              type="button"
                              disabled={
                                procesandoId === cheque.id
                              }
                              onClick={() =>
                                void marcarDevuelto(cheque)
                              }
                              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                            >
                              Devuelto
                            </button>
                          )}

                          {cheque.status !== "collected" &&
                            cheque.status !== "cancelled" && (
                              <button
                                type="button"
                                disabled={
                                  procesandoId === cheque.id
                                }
                                onClick={() =>
                                  void marcarCancelado(cheque)
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {chequeSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Detalle del cheque
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Referencia {chequeSeleccionado.internal_reference}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setChequeSeleccionado(null)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detalle
                etiqueta="Banco"
                valor={obtenerTextoBanco(
                  chequeSeleccionado.bank,
                  chequeSeleccionado.other_bank,
                )}
              />
              <Detalle
                etiqueta="Número de cheque"
                valor={chequeSeleccionado.check_number}
              />
              <Detalle
                etiqueta="Titular"
                valor={
                  chequeSeleccionado.drawer_name ||
                  chequeSeleccionado.beneficiary_name ||
                  "No indicado"
                }
              />
              <Detalle
                etiqueta="Fecha del cheque"
                valor={formatearFecha(
                  chequeSeleccionado.check_date,
                )}
              />
              <Detalle
                etiqueta="Monto bruto"
                valor={formatearMonto(
                  chequeSeleccionado.gross_amount,
                  chequeSeleccionado.currencies,
                )}
              />
              <Detalle
                etiqueta="Comisión"
                valor={`${formatearMonto(
                  chequeSeleccionado.commission_amount,
                  chequeSeleccionado.currencies,
                )} (${Number(
                  chequeSeleccionado.commission_rate,
                ).toFixed(2)}%)`}
              />
              <Detalle
                etiqueta="Efectivo entregado"
                valor={formatearMonto(
                  chequeSeleccionado.net_amount,
                  chequeSeleccionado.currencies,
                )}
              />
              <Detalle
                etiqueta="Estado"
                valor={obtenerTextoEstado(
                  chequeSeleccionado.status,
                )}
              />
              <Detalle
                etiqueta="Fecha de depósito"
                valor={formatearFecha(
                  chequeSeleccionado.deposited_at,
                )}
              />
              <Detalle
                etiqueta="Fecha de cobro"
                valor={formatearFecha(
                  chequeSeleccionado.collected_at,
                )}
              />
              <Detalle
                etiqueta="Fecha de devolución"
                valor={formatearFecha(
                  chequeSeleccionado.returned_at,
                )}
              />
              <Detalle
                etiqueta="Días pendiente"
                valor={
                  calcularDiasPendiente(
                    chequeSeleccionado,
                  ) === null
                    ? "—"
                    : String(
                        calcularDiasPendiente(
                          chequeSeleccionado,
                        ),
                      )
                }
              />
            </div>

            {chequeSeleccionado.return_reason && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">
                  Motivo de devolución
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {chequeSeleccionado.return_reason}
                </p>
              </div>
            )}

            <div className="mt-5 rounded-xl bg-slate-100 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Observaciones
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {chequeSeleccionado.notes || "Sin observaciones"}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setChequeSeleccionado(null)}
                className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() =>
                  imprimirComprobante(chequeSeleccionado)
                }
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Imprimir comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TarjetaResumen({
  titulo,
  cantidad,
  monto,
}: {
  titulo: string;
  cantidad: number;
  monto: number;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-600">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold text-blue-900">
        RD${" "}
        {Number(monto).toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {cantidad} cheque{cantidad === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function sumarMonto(cheques: ChequePorCobrar[]) {
  return cheques.reduce(function sumar(total, cheque) {
    return total + Number(cheque.gross_amount);
  }, 0);
}

function obtenerTextoBanco(
  banco: string,
  otroBanco: string | null,
) {
  if (banco === "popular") return "Banco Popular";
  if (banco === "banreservas") return "Banreservas";
  if (banco === "bhd") return "BHD";
  if (banco === "coopvega_real") return "Coopvega Real";
  if (banco === "santacruz") return "Banco Santa Cruz";
  if (banco === "alaver") return "Alaver";
  if (banco === "scotiabank") return "Scotiabank";
  return otroBanco || "Otro";
}


function Detalle({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">
        {etiqueta}
      </p>
      <p className="mt-1 font-medium text-gray-900">
        {valor}
      </p>
    </div>
  );
}
