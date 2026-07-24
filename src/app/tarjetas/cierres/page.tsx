"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../../lib/supabase";

type Cierre = {
  id: string;
  closure_number: string;
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_withdrawn: number;
  total_payment_applied: number;
  total_principal: number;
  total_interest: number;
  total_late_fee: number;
  total_bank_fee: number;
  total_surplus: number;
  gross_profit: number;
  net_profit: number;
  status: "draft" | "closed" | "cancelled";
  notes: string | null;
  closed_at: string;
};

type VistaPrevia = {
  total_transactions: number;
  total_withdrawn: number;
  total_payment_applied: number;
  total_principal: number;
  total_interest: number;
  total_late_fee: number;
  total_bank_fee: number;
  total_surplus: number;
  gross_profit: number;
  net_profit: number;
};

type RetiroPendiente = {
  id: string;
  collection_date: string;
  withdrawn_amount: number;
  payment_applied: number;
  client_surplus: number;
  bank_fee: number;
  reference_number: string | null;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
  loans: {
    loan_number: string;
  } | null;
  loan_card_details: {
    bank_name: string;
    card_last_four: string;
  } | null;
  loan_payments: {
    principal_amount: number;
    interest_amount: number;
    late_fee_amount: number;
  } | null;
};

type ResumenDetalle = {
  closure_id: string;
  closure_number: string;
  period_start: string;
  period_end: string;
  status: string;
  total_transactions: number;
  total_clients: number;
  total_loans: number;
  total_banks: number;
  total_withdrawn: number;
  total_payment_applied: number;
  total_principal: number;
  total_interest: number;
  total_late_fee: number;
  total_bank_fee: number;
  total_surplus: number;
  gross_profit: number;
  net_profit: number;
  notes: string | null;
  closed_by: string | null;
  closed_at: string;
  reopened_by: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
};

type RetiroDetalle = {
  transaction_id: string;
  collection_date: string;
  client_id: string;
  client_name: string;
  loan_id: string;
  loan_number: string;
  bank_name: string;
  card_last_four: string;
  reference_number: string | null;
  withdrawn_amount: number;
  payment_applied: number;
  principal_amount: number;
  interest_amount: number;
  late_fee_amount: number;
  bank_fee: number;
  client_surplus: number;
};

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaMes() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

export default function CierresTarjetasPage() {
  const supabase = useMemo(() => createClient(), []);

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes());
  const [fechaFin, setFechaFin] = useState(fechaActual());
  const [notas, setNotas] = useState("");
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [retiros, setRetiros] = useState<RetiroPendiente[]>([]);
  const [vistaPrevia, setVistaPrevia] =
    useState<VistaPrevia | null>(null);

  const [detalle, setDetalle] = useState<ResumenDetalle | null>(null);
  const [detalleRetiros, setDetalleRetiros] = useState<RetiroDetalle[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState("");
  const [mostrarReapertura, setMostrarReapertura] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const cargarCierres = useCallback(async () => {
    const resultado = await supabase
      .from("card_closures")
      .select(
        "id, closure_number, period_start, period_end, total_transactions, total_withdrawn, total_payment_applied, total_principal, total_interest, total_late_fee, total_bank_fee, total_surplus, gross_profit, net_profit, status, notes, closed_at",
      )
      .order("closed_at", { ascending: false });

    if (resultado.error) {
      setMensajeError(
        "No se pudieron cargar los cierres: " + resultado.error.message,
      );
      setCierres([]);
      return;
    }

    setCierres((resultado.data || []) as Cierre[]);
  }, [supabase]);

  const cargarRetirosPendientes = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      setRetiros([]);
      return;
    }

    const inicio = `${fechaInicio}T00:00:00`;
    const fin = new Date(`${fechaFin}T00:00:00`);
    fin.setDate(fin.getDate() + 1);

    const resultado = await supabase
      .from("card_collection_transactions")
      .select(
        "id, collection_date, withdrawn_amount, payment_applied, client_surplus, bank_fee, reference_number, clients(first_name, last_name), loans(loan_number), loan_card_details(bank_name, card_last_four), loan_payments(principal_amount, interest_amount, late_fee_amount)",
      )
      .gte("collection_date", inicio)
      .lt("collection_date", fin.toISOString())
      .eq("status", "posted")
      .eq("closure_status", "pending")
      .is("closure_id", null)
      .order("collection_date", { ascending: true });

    if (resultado.error) {
      setMensajeError(
        "No se pudieron cargar los retiros pendientes: " +
          resultado.error.message,
      );
      setRetiros([]);
      return;
    }

    setRetiros(
      (resultado.data || []) as unknown as RetiroPendiente[],
    );
  }, [supabase, fechaInicio, fechaFin]);

  useEffect(() => {
    async function iniciar() {
      setCargando(true);
      await Promise.all([cargarCierres(), cargarRetirosPendientes()]);
      setCargando(false);
    }

    void iniciar();
  }, [cargarCierres, cargarRetirosPendientes]);

  async function calcularVistaPrevia(
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();
    setCalculando(true);
    setMensajeError("");
    setMensajeExito("");
    setVistaPrevia(null);

    if (!fechaInicio || !fechaFin) {
      setMensajeError(
        "Debes seleccionar la fecha inicial y la fecha final.",
      );
      setCalculando(false);
      return;
    }

    if (fechaFin < fechaInicio) {
      setMensajeError(
        "La fecha final no puede ser menor que la fecha inicial.",
      );
      setCalculando(false);
      return;
    }

    const resultado = await supabase.rpc("preview_card_closure", {
      p_period_start: fechaInicio,
      p_period_end: fechaFin,
    });

    if (resultado.error) {
      setMensajeError(
        "No se pudo calcular la vista previa: " +
          resultado.error.message,
      );
      setCalculando(false);
      return;
    }

    const fila = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    setVistaPrevia({
      total_transactions: Number(fila?.total_transactions || 0),
      total_withdrawn: Number(fila?.total_withdrawn || 0),
      total_payment_applied: Number(
        fila?.total_payment_applied || 0,
      ),
      total_principal: Number(fila?.total_principal || 0),
      total_interest: Number(fila?.total_interest || 0),
      total_late_fee: Number(fila?.total_late_fee || 0),
      total_bank_fee: Number(fila?.total_bank_fee || 0),
      total_surplus: Number(fila?.total_surplus || 0),
      gross_profit: Number(fila?.gross_profit || 0),
      net_profit: Number(fila?.net_profit || 0),
    });

    await cargarRetirosPendientes();
    setCalculando(false);
  }

  async function confirmarCierre() {
    if (!vistaPrevia || vistaPrevia.total_transactions === 0) {
      setMensajeError(
        "Primero calcula una vista previa con retiros pendientes.",
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas el cierre del ${formatearFecha(
        fechaInicio,
      )} al ${formatearFecha(fechaFin)}?\n\n` +
        `Retiros: ${vistaPrevia.total_transactions}\n` +
        `Total retirado: ${formatearMonto(
          vistaPrevia.total_withdrawn,
        )}\n` +
        `Ganancia neta: ${formatearMonto(
          vistaPrevia.net_profit,
        )}\n\n` +
        "Después de cerrar, estas operaciones no podrán incluirse en otro cierre.",
    );

    if (!confirmar) return;

    setCerrando(true);
    setMensajeError("");
    setMensajeExito("");

    const resultado = await supabase.rpc("create_card_closure", {
      p_period_start: fechaInicio,
      p_period_end: fechaFin,
      p_notes: notas.trim() || null,
    });

    if (resultado.error) {
      setMensajeError(
        "No se pudo completar el cierre: " +
          resultado.error.message,
      );
      setCerrando(false);
      return;
    }

    const fila = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    setMensajeExito(
      `Cierre ${fila?.closure_number || ""} creado correctamente con ${
        fila?.total_transactions || 0
      } retiros.`,
    );

    setVistaPrevia(null);
    setRetiros([]);
    setNotas("");
    await cargarCierres();
    await cargarRetirosPendientes();
    setCerrando(false);
  }

  async function abrirDetalle(cierre: Cierre) {
    setCargandoDetalle(true);
    setMensajeError("");
    setDetalle(null);
    setDetalleRetiros([]);
    setMostrarReapertura(false);
    setMotivoReapertura("");

    const [resumenResultado, retirosResultado] = await Promise.all([
      supabase.rpc("get_card_closure_summary", {
        p_closure_id: cierre.id,
      }),
      supabase.rpc("get_card_closure_transactions", {
        p_closure_id: cierre.id,
      }),
    ]);

    if (resumenResultado.error) {
      setMensajeError(
        "No se pudo cargar el resumen del cierre: " +
          resumenResultado.error.message,
      );
      setCargandoDetalle(false);
      return;
    }

    if (retirosResultado.error) {
      setMensajeError(
        "No se pudieron cargar los retiros del cierre: " +
          retirosResultado.error.message,
      );
      setCargandoDetalle(false);
      return;
    }

    const fila = Array.isArray(resumenResultado.data)
      ? resumenResultado.data[0]
      : resumenResultado.data;

    setDetalle(fila as ResumenDetalle);
    setDetalleRetiros(
      (retirosResultado.data || []) as RetiroDetalle[],
    );
    setCargandoDetalle(false);
  }

  function cerrarDetalle() {
    if (!reabriendo) {
      setDetalle(null);
      setDetalleRetiros([]);
      setMostrarReapertura(false);
      setMotivoReapertura("");
    }
  }

  async function reabrirCierre() {
    if (!detalle) return;

    if (motivoReapertura.trim() === "") {
      setMensajeError(
        "Debes escribir el motivo de la reapertura.",
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que deseas reabrir el cierre ${detalle.closure_number}?\n\n` +
        "Sus retiros volverán a estar pendientes y podrán incluirse en un nuevo cierre.",
    );

    if (!confirmar) return;

    setReabriendo(true);
    setMensajeError("");
    setMensajeExito("");

    const resultado = await supabase.rpc(
      "reopen_card_closure",
      {
        p_closure_id: detalle.closure_id,
        p_reason: motivoReapertura.trim(),
      },
    );

    if (resultado.error) {
      setMensajeError(
        "No se pudo reabrir el cierre: " +
          resultado.error.message,
      );
      setReabriendo(false);
      return;
    }

    const fila = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    setMensajeExito(
      `Cierre ${fila?.closure_number || ""} reabierto. ${
        fila?.reopened_transactions || 0
      } retiros volvieron a estado pendiente.`,
    );

    setDetalle(null);
    setDetalleRetiros([]);
    setMostrarReapertura(false);
    setMotivoReapertura("");
    setVistaPrevia(null);

    await cargarCierres();
    await cargarRetirosPendientes();
    setReabriendo(false);
  }

  function imprimirCierre(cierre: Cierre | ResumenDetalle) {
    const ventana = window.open(
      "",
      "_blank",
      "width=1000,height=900",
    );

    if (!ventana) {
      window.alert(
        "El navegador bloqueó la ventana de impresión.",
      );
      return;
    }

    const numero =
      "closure_number" in cierre ? cierre.closure_number : "";
    const periodoInicio = cierre.period_start;
    const periodoFin = cierre.period_end;
    const fechaCierre = cierre.closed_at;

    const filas =
      detalle &&
      detalle.closure_number === numero &&
      detalleRetiros.length > 0
        ? detalleRetiros
            .map(
              (retiro) => `
                <tr>
                  <td>${formatearFechaHora(retiro.collection_date)}</td>
                  <td>${retiro.client_name || "—"}</td>
                  <td>${retiro.loan_number || "—"}</td>
                  <td>${retiro.bank_name || "—"}</td>
                  <td>**** ${retiro.card_last_four || "—"}</td>
                  <td>${formatearMonto(retiro.withdrawn_amount)}</td>
                  <td>${formatearMonto(retiro.principal_amount)}</td>
                  <td>${formatearMonto(retiro.interest_amount)}</td>
                  <td>${formatearMonto(retiro.late_fee_amount)}</td>
                  <td>${formatearMonto(retiro.client_surplus)}</td>
                </tr>
              `,
            )
            .join("")
        : "";

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${numero}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
            }
            .reporte {
              max-width: 1100px;
              margin: 0 auto;
            }
            h1, h2 { text-align: center; margin: 0; }
            h1 { font-size: 24px; }
            h2 { margin-top: 6px; font-size: 17px; }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-top: 24px;
            }
            .dato {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 12px;
            }
            .etiqueta {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
            }
            .valor {
              margin-top: 5px;
              font-size: 18px;
              font-weight: bold;
            }
            .ganancia {
              margin-top: 24px;
              border: 2px solid #166534;
              border-radius: 10px;
              padding: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 6px;
              text-align: left;
            }
            th { background: #f1f5f9; }
            .firma {
              margin-top: 60px;
              text-align: center;
            }
            @page { margin: 10mm; size: landscape; }
          </style>
        </head>
        <body>
          <div class="reporte">
            <h1>MattFinance ERP</h1>
            <h2>CIERRE DE TARJETAS</h2>
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Período:</strong> ${formatearFecha(
              periodoInicio,
            )} al ${formatearFecha(periodoFin)}</p>
            <p><strong>Fecha de cierre:</strong> ${formatearFechaHora(
              fechaCierre,
            )}</p>

            <div class="grid">
              ${datoImpresion(
                "Cantidad de retiros",
                String(cierre.total_transactions),
              )}
              ${datoImpresion(
                "Total retirado",
                formatearMonto(cierre.total_withdrawn),
              )}
              ${datoImpresion(
                "Aplicado a préstamos",
                formatearMonto(cierre.total_payment_applied),
              )}
              ${datoImpresion(
                "Capital recuperado",
                formatearMonto(cierre.total_principal),
              )}
              ${datoImpresion(
                "Interés cobrado",
                formatearMonto(cierre.total_interest),
              )}
              ${datoImpresion(
                "Mora cobrada",
                formatearMonto(cierre.total_late_fee),
              )}
              ${datoImpresion(
                "Comisiones bancarias",
                formatearMonto(cierre.total_bank_fee),
              )}
              ${datoImpresion(
                "Sobrantes generados",
                formatearMonto(cierre.total_surplus),
              )}
            </div>

            <div class="ganancia">
              <p><strong>Ganancia bruta:</strong> ${formatearMonto(
                cierre.gross_profit,
              )}</p>
              <p><strong>Ganancia neta:</strong> ${formatearMonto(
                cierre.net_profit,
              )}</p>
            </div>

            ${
              filas
                ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Préstamo</th>
                        <th>Banco</th>
                        <th>Tarjeta</th>
                        <th>Retirado</th>
                        <th>Capital</th>
                        <th>Interés</th>
                        <th>Mora</th>
                        <th>Sobrante</th>
                      </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                  </table>
                `
                : ""
            }

            <p><strong>Observaciones:</strong> ${
              cierre.notes || "Ninguna"
            }</p>

            <div class="firma">
              _______________________________<br />
              Responsable del cierre
            </div>
          </div>
        </body>
      </html>
    `);

    ventana.document.close();
    ventana.focus();
    ventana.onload = () => ventana.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-4xl font-bold text-blue-900">
            Cierres de tarjetas
          </h1>
          <p className="mt-2 text-gray-600">
            Consolida retiros por período y separa capital,
            intereses, mora, comisiones y sobrantes sin afectar
            Caja.
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

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Preparar cierre
          </h2>

          <form
            onSubmit={calcularVistaPrevia}
            className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <Campo
              id="fecha_inicio"
              etiqueta="Fecha inicial"
              tipo="date"
              valor={fechaInicio}
              cambiar={setFechaInicio}
              requerido
            />

            <Campo
              id="fecha_fin"
              etiqueta="Fecha final"
              tipo="date"
              valor={fechaFin}
              cambiar={setFechaFin}
              requerido
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Observaciones del cierre
              </label>
              <input
                type="text"
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={calculando || cerrando}
                className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {calculando
                  ? "Calculando..."
                  : "Calcular vista previa"}
              </button>
            </div>
          </form>
        </section>

        {vistaPrevia && (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-blue-900">
                  Vista previa del cierre
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Revisa cuidadosamente antes de confirmar.
                </p>
              </div>

              <button
                type="button"
                onClick={confirmarCierre}
                disabled={
                  cerrando ||
                  vistaPrevia.total_transactions === 0
                }
                className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {cerrando
                  ? "Cerrando..."
                  : "Confirmar cierre"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Resumen
                titulo="Retiros"
                valor={String(vistaPrevia.total_transactions)}
              />
              <Resumen
                titulo="Total retirado"
                valor={formatearMonto(
                  vistaPrevia.total_withdrawn,
                )}
              />
              <Resumen
                titulo="Capital recuperado"
                valor={formatearMonto(
                  vistaPrevia.total_principal,
                )}
              />
              <Resumen
                titulo="Interés"
                valor={formatearMonto(
                  vistaPrevia.total_interest,
                )}
              />
              <Resumen
                titulo="Mora"
                valor={formatearMonto(
                  vistaPrevia.total_late_fee,
                )}
              />
              <Resumen
                titulo="Aplicado a préstamos"
                valor={formatearMonto(
                  vistaPrevia.total_payment_applied,
                )}
              />
              <Resumen
                titulo="Comisiones"
                valor={formatearMonto(
                  vistaPrevia.total_bank_fee,
                )}
              />
              <Resumen
                titulo="Sobrantes"
                valor={formatearMonto(
                  vistaPrevia.total_surplus,
                )}
              />
              <Resumen
                titulo="Ganancia bruta"
                valor={formatearMonto(
                  vistaPrevia.gross_profit,
                )}
              />
              <Resumen
                titulo="Ganancia neta"
                valor={formatearMonto(
                  vistaPrevia.net_profit,
                )}
                destacado
              />
            </div>

            <TablaRetiros retiros={retiros} />
          </section>
        )}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Historial de cierres
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Cierre",
                    "Período",
                    "Retiros",
                    "Retirado",
                    "Capital",
                    "Interés",
                    "Mora",
                    "Ganancia neta",
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
                      colSpan={10}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Cargando cierres...
                    </td>
                  </tr>
                ) : cierres.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Todavía no se ha realizado ningún cierre.
                    </td>
                  </tr>
                ) : (
                  cierres.map((cierre) => (
                    <tr key={cierre.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-blue-900">
                        {cierre.closure_number}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearFecha(cierre.period_start)} al{" "}
                        {formatearFecha(cierre.period_end)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {cierre.total_transactions}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearMonto(cierre.total_withdrawn)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-blue-900">
                        {formatearMonto(cierre.total_principal)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-green-700">
                        {formatearMonto(cierre.total_interest)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-red-700">
                        {formatearMonto(cierre.total_late_fee)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-green-800">
                        {formatearMonto(cierre.net_profit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={claseEstado(cierre.status)}>
                          {textoEstado(cierre.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void abrirDetalle(cierre)}
                            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Ver detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => imprimirCierre(cierre)}
                            className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                          >
                            Imprimir
                          </button>
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

      {(cargandoDetalle || detalle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {cargandoDetalle ? (
              <p className="py-12 text-center text-gray-500">
                Cargando detalle del cierre...
              </p>
            ) : detalle ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900">
                      {detalle.closure_number}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatearFecha(detalle.period_start)} al{" "}
                      {formatearFecha(detalle.period_end)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cerrarDetalle}
                    className="text-2xl text-gray-500 hover:text-gray-900"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Resumen titulo="Clientes" valor={String(detalle.total_clients)} />
                  <Resumen titulo="Préstamos" valor={String(detalle.total_loans)} />
                  <Resumen titulo="Bancos" valor={String(detalle.total_banks)} />
                  <Resumen titulo="Retiros" valor={String(detalle.total_transactions)} />
                  <Resumen titulo="Total retirado" valor={formatearMonto(detalle.total_withdrawn)} />
                  <Resumen titulo="Capital" valor={formatearMonto(detalle.total_principal)} />
                  <Resumen titulo="Interés" valor={formatearMonto(detalle.total_interest)} />
                  <Resumen titulo="Mora" valor={formatearMonto(detalle.total_late_fee)} />
                  <Resumen titulo="Comisiones" valor={formatearMonto(detalle.total_bank_fee)} />
                  <Resumen titulo="Sobrantes" valor={formatearMonto(detalle.total_surplus)} />
                  <Resumen titulo="Ganancia bruta" valor={formatearMonto(detalle.gross_profit)} />
                  <Resumen titulo="Ganancia neta" valor={formatearMonto(detalle.net_profit)} destacado />
                </div>

                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-gray-700">
                  <p><strong>Estado:</strong> {textoEstado(detalle.status as Cierre["status"])}</p>
                  <p><strong>Fecha del cierre:</strong> {formatearFechaHora(detalle.closed_at)}</p>
                  <p><strong>Observaciones:</strong> {detalle.notes || "Ninguna"}</p>
                  {detalle.reopened_at && (
                    <>
                      <p><strong>Fecha de reapertura:</strong> {formatearFechaHora(detalle.reopened_at)}</p>
                      <p><strong>Motivo:</strong> {detalle.reopen_reason || "—"}</p>
                    </>
                  )}
                </div>

                <TablaDetalle retiros={detalleRetiros} />

                {mostrarReapertura && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
                    <label className="block text-sm font-semibold text-red-900">
                      Motivo de la reapertura
                    </label>
                    <textarea
                      rows={3}
                      value={motivoReapertura}
                      onChange={(event) =>
                        setMotivoReapertura(event.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-red-300 bg-white p-3 outline-none focus:border-red-700"
                    />
                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarReapertura(false);
                          setMotivoReapertura("");
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void reabrirCierre()}
                        disabled={reabriendo}
                        className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                      >
                        {reabriendo ? "Reabriendo..." : "Confirmar reapertura"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => imprimirCierre(detalle)}
                    className="rounded-lg border border-blue-300 px-5 py-3 font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    Imprimir reporte
                  </button>

                  {detalle.status === "closed" &&
                    !mostrarReapertura && (
                      <button
                        type="button"
                        onClick={() => setMostrarReapertura(true)}
                        className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                      >
                        Reabrir cierre
                      </button>
                    )}

                  <button
                    type="button"
                    onClick={cerrarDetalle}
                    className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

function TablaRetiros({ retiros }: { retiros: RetiroPendiente[] }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-slate-50">
          <tr>
            {[
              "Fecha",
              "Cliente",
              "Préstamo",
              "Banco",
              "Tarjeta",
              "Retirado",
              "Capital",
              "Interés",
              "Mora",
              "Sobrante",
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
          {retiros.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                No hay retiros pendientes en este período.
              </td>
            </tr>
          ) : (
            retiros.map((retiro) => (
              <tr key={retiro.id}>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {formatearFechaHora(retiro.collection_date)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                  {retiro.clients
                    ? `${retiro.clients.first_name} ${retiro.clients.last_name}`
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {retiro.loans?.loan_number || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {retiro.loan_card_details?.bank_name || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  **** {retiro.loan_card_details?.card_last_four || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                  {formatearMonto(retiro.withdrawn_amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-blue-900">
                  {formatearMonto(
                    retiro.loan_payments?.principal_amount || 0,
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-green-700">
                  {formatearMonto(
                    retiro.loan_payments?.interest_amount || 0,
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-red-700">
                  {formatearMonto(
                    retiro.loan_payments?.late_fee_amount || 0,
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-amber-700">
                  {formatearMonto(retiro.client_surplus)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TablaDetalle({ retiros }: { retiros: RetiroDetalle[] }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-slate-50">
          <tr>
            {[
              "Fecha",
              "Cliente",
              "Préstamo",
              "Banco",
              "Tarjeta",
              "Retirado",
              "Capital",
              "Interés",
              "Mora",
              "Sobrante",
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
          {retiros.map((retiro) => (
            <tr key={retiro.transaction_id}>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                {formatearFechaHora(retiro.collection_date)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                {retiro.client_name || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                {retiro.loan_number || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                {retiro.bank_name || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                **** {retiro.card_last_four || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                {formatearMonto(retiro.withdrawn_amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-blue-900">
                {formatearMonto(retiro.principal_amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-green-700">
                {formatearMonto(retiro.interest_amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-red-700">
                {formatearMonto(retiro.late_fee_amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-amber-700">
                {formatearMonto(retiro.client_surplus)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  valor,
  cambiar,
  tipo = "text",
  requerido = false,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  cambiar: (valor: string) => void;
  tipo?: string;
  requerido?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {etiqueta}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(event) => cambiar(event.target.value)}
        required={requerido}
        className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
      />
    </div>
  );
}

function Resumen({
  titulo,
  valor,
  destacado = false,
}: {
  titulo: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={
        destacado
          ? "rounded-xl border border-green-300 bg-green-50 p-4"
          : "rounded-xl bg-slate-50 p-4"
      }
    >
      <p className="text-sm text-gray-500">{titulo}</p>
      <p
        className={
          destacado
            ? "mt-1 text-xl font-bold text-green-800"
            : "mt-1 text-xl font-bold text-gray-900"
        }
      >
        {valor}
      </p>
    </div>
  );
}

function formatearMonto(monto: number) {
  return (
    "RD$ " +
    Number(monto).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatearFecha(fecha: string) {
  return new Date(fecha + "T12:00:00").toLocaleDateString(
    "es-DO",
  );
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function datoImpresion(etiqueta: string, valor: string) {
  return `
    <div class="dato">
      <div class="etiqueta">${etiqueta}</div>
      <div class="valor">${valor}</div>
    </div>
  `;
}

function textoEstado(estado: Cierre["status"]) {
  if (estado === "closed") return "Cerrado";
  if (estado === "cancelled") return "Reabierto";
  return "Borrador";
}

function claseEstado(estado: Cierre["status"]) {
  const base =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ";

  if (estado === "closed") {
    return base + "bg-green-100 text-green-800";
  }

  if (estado === "cancelled") {
    return base + "bg-red-100 text-red-800";
  }

  return base + "bg-gray-200 text-gray-700";
}
