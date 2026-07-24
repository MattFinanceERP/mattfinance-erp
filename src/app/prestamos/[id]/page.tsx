"use client";
 
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { createClient } from "../../lib/supabase";
 
type Cliente = {
  first_name: string;
  last_name: string;
  document_number: string;
  phone_primary: string;
};
 
type Moneda = {
  code: string;
  symbol: string;
};
 
type Prestamo = {
  id: string;
  loan_number: string;
  loan_type: string;
  principal_amount: number;
  principal_balance: number;
  interest_rate: number;
  interest_balance: number;
  late_fee_balance: number;
  interest_frequency: string;
  term_count: number;
  start_date: string;
  due_date: string | null;
  status: string;
  notes: string | null;
  clients: Cliente | null;
  currencies: Moneda | null;
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
};
 
type CuotaReal = {
  id: string;
  installment_number: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  late_fee_due: number;
  principal_paid: number;
  interest_paid: number;
  late_fee_paid: number;
  status: "pending" | "partial" | "paid" | "overdue" | "cancelled";
  paid_at: string | null;
  notes: string | null;
};
 
type CuotaProyectada = {
  numero: number;
  fecha: string;
  capital: number;
  interes: number;
  total: number;
};
 
type DetalleTarjeta = {
  id: string;
  bank_name: string;
  card_last_four: string;
  cardholder_name: string;
  employer_name: string | null;
  work_sector: string | null;
  work_location: string | null;
  job_position: string | null;
  estimated_salary: number | null;
  collection_frequency: string;
  collection_weekday: string | null;
  collection_day_1: number | null;
  collection_day_2: number | null;
  next_collection_date: string | null;
  card_status: string;
  custody_received_at: string | null;
  returned_at: string | null;
  notes: string | null;
};
 
type GarantiaPrestamo = {
  id: string;
  collateral_type: string;
  description: string;
  brand: string | null;
  model: string | null;
  manufacture_year: number | null;
  serial_number: string | null;
  registration_number: string | null;
  plate_number: string | null;
  chassis_number: string | null;
  title_number: string | null;
  estimated_value: number | null;
  accepted_value: number | null;
  physical_condition: string | null;
  storage_location: string | null;
  received_date: string;
  collateral_status: string;
  released_at: string | null;
  returned_at: string | null;
  executed_at: string | null;
  notes: string | null;
};
type RetiroTarjetaPrestamo = {
  id: string;
  collection_date: string;
  withdrawn_amount: number;
  payment_applied: number;
  client_surplus: number;
  bank_fee: number;
  reference_number: string | null;
  closure_id: string | null;
  closure_status: string;
  status: string;
};

type CierreTarjetaPrestamo = {
  id: string;
  closure_number: string;
  period_start: string;
  period_end: string;
  closed_at: string;
  status: string;
};

type SobrantePrestamo = {
  id: string;
  original_amount: number;
  delivered_amount: number;
  pending_amount: number;
  status: string;
  delivered_at: string | null;
  delivered_to: string | null;
  delivery_reference: string | null;
  created_at: string;
};

type VentaGarantiaPrestamo = {
  id: string;
  sale_number: string;
  sale_date: string;
  buyer_name: string;
  gross_sale_amount: number;
  total_expenses: number;
  net_sale_amount: number;
  amount_applied_to_loan: number;
  remaining_amount: number;
  status: string;
};

type EventoExpedientePrestamo = {
  id: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  categoria:
    | "prestamo"
    | "pago"
    | "tarjeta"
    | "cierre"
    | "sobrante"
    | "venta"
    | "garantia";
  monto?: number;
};

 
export default function PrestamoDetallePage() {
  const params = useParams();
  const router = useRouter();
 
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);
 
  const prestamoId = String(params.id || "");
 
  const [prestamo, setPrestamo] =
    useState<Prestamo | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cuotasReales, setCuotasReales] = useState<CuotaReal[]>([]);
  const [detalleTarjeta, setDetalleTarjeta] =
    useState<DetalleTarjeta | null>(null);
  const [garantias, setGarantias] =
    useState<GarantiaPrestamo[]>([]);
  const [retirosTarjeta, setRetirosTarjeta] =
    useState<RetiroTarjetaPrestamo[]>([]);
  const [cierresTarjeta, setCierresTarjeta] =
    useState<CierreTarjetaPrestamo[]>([]);
  const [sobrantes, setSobrantes] =
    useState<SobrantePrestamo[]>([]);
  const [ventasGarantia, setVentasGarantia] =
    useState<VentaGarantiaPrestamo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
 
  useEffect(
    function cargarPrestamoAlAbrir() {
      async function cargarPrestamo() {
        if (prestamoId === "") {
          setMensajeError(
            "No se recibió el identificador del préstamo.",
          );
          setCargando(false);
          return;
        }
 
        setCargando(true);
        setMensajeError("");
 
        const resultado = await supabase
          .from("loans")
          .select(
            "id, loan_number, loan_type, principal_amount, principal_balance, interest_rate, interest_balance, late_fee_balance, interest_frequency, term_count, start_date, due_date, status, notes, clients(first_name, last_name, document_number, phone_primary), currencies(code, symbol)",
          )
          .eq("id", prestamoId)
          .single();
 
        const resultadoPagos = await supabase
          .from("loan_payments")
          .select(
            "id, payment_number, payment_date, amount, principal_amount, interest_amount, late_fee_amount, payment_method, affects_cash, status",
          )
          .eq("loan_id", prestamoId)
          .order("payment_date", { ascending: false });
 
        const resultadoCuotas = await supabase
          .from("loan_installments")
          .select(
            "id, installment_number, due_date, principal_due, interest_due, late_fee_due, principal_paid, interest_paid, late_fee_paid, status, paid_at, notes",
          )
          .eq("loan_id", prestamoId)
          .order("installment_number", { ascending: true });
 
        const resultadoTarjeta = await supabase
          .from("loan_card_details")
          .select(
            "id, bank_name, card_last_four, cardholder_name, employer_name, work_sector, work_location, job_position, estimated_salary, collection_frequency, collection_weekday, collection_day_1, collection_day_2, next_collection_date, card_status, custody_received_at, returned_at, notes",
          )
          .eq("loan_id", prestamoId)
          .maybeSingle();
 
        const resultadoGarantias = await supabase
          .from("loan_collaterals")
          .select(
            "id, collateral_type, description, brand, model, manufacture_year, serial_number, registration_number, plate_number, chassis_number, title_number, estimated_value, accepted_value, physical_condition, storage_location, received_date, collateral_status, released_at, returned_at, executed_at, notes",
          )
          .eq("loan_id", prestamoId)
          .order("created_at", { ascending: true });

        const resultadoRetirosTarjeta = await supabase
          .from("card_collection_transactions")
          .select(
            "id, collection_date, withdrawn_amount, payment_applied, client_surplus, bank_fee, reference_number, closure_id, closure_status, status",
          )
          .eq("loan_id", prestamoId)
          .order("collection_date", { ascending: true });

        const resultadoSobrantes = await supabase
          .from("client_surplus_balances")
          .select(
            "id, original_amount, delivered_amount, pending_amount, status, delivered_at, delivered_to, delivery_reference, created_at",
          )
          .eq("loan_id", prestamoId)
          .order("created_at", { ascending: true });

        const resultadoVentasGarantia = await supabase
          .from("collateral_sales")
          .select(
            "id, sale_number, sale_date, buyer_name, gross_sale_amount, total_expenses, net_sale_amount, amount_applied_to_loan, remaining_amount, status",
          )
          .eq("loan_id", prestamoId)
          .order("sale_date", { ascending: true });

        const idsCierres = Array.from(
          new Set(
            ((resultadoRetirosTarjeta.data || []) as RetiroTarjetaPrestamo[])
              .map((retiro) => retiro.closure_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );

        const resultadoCierresTarjeta =
          idsCierres.length === 0
            ? { data: [], error: null }
            : await supabase
                .from("card_closures")
                .select(
                  "id, closure_number, period_start, period_end, closed_at, status",
                )
                .in("id", idsCierres)
                .order("closed_at", { ascending: true });
 
        if (resultado.error) {
          setMensajeError(
            "No se pudo cargar el préstamo: " +
              resultado.error.message,
          );
          setPrestamo(null);
        } else {
          setPrestamo(
            resultado.data as unknown as Prestamo,
          );
        }
 
        if (resultadoPagos.error) {
          setMensajeError(
            "No se pudo cargar el historial de pagos: " +
              resultadoPagos.error.message,
          );
          setPagos([]);
        } else {
          setPagos(
            (resultadoPagos.data || []) as Pago[],
          );
        }
 
        if (resultadoCuotas.error) {
          setMensajeError(
            "No se pudieron cargar las cuotas reales: " +
              resultadoCuotas.error.message,
          );
          setCuotasReales([]);
        } else {
          setCuotasReales(
            (resultadoCuotas.data || []) as CuotaReal[],
          );
        }
 
        if (resultadoTarjeta.error) {
          setMensajeError(
            "No se pudo cargar la información de la tarjeta: " +
              resultadoTarjeta.error.message,
          );
          setDetalleTarjeta(null);
        } else {
          setDetalleTarjeta(
            (resultadoTarjeta.data as DetalleTarjeta | null) || null,
          );
        }
 
        if (resultadoGarantias.error) {
          setMensajeError(
            "No se pudieron cargar las garantías: " +
              resultadoGarantias.error.message,
          );
          setGarantias([]);
        } else {
          setGarantias(
            (resultadoGarantias.data || []) as GarantiaPrestamo[],
          );
        }

        if (resultadoRetirosTarjeta.error) {
          setMensajeError(
            "No se pudieron cargar los retiros de tarjeta: " +
              resultadoRetirosTarjeta.error.message,
          );
          setRetirosTarjeta([]);
        } else {
          setRetirosTarjeta(
            (resultadoRetirosTarjeta.data || []) as RetiroTarjetaPrestamo[],
          );
        }

        if (resultadoCierresTarjeta.error) {
          setMensajeError(
            "No se pudieron cargar los cierres de tarjeta: " +
              resultadoCierresTarjeta.error.message,
          );
          setCierresTarjeta([]);
        } else {
          setCierresTarjeta(
            (resultadoCierresTarjeta.data || []) as CierreTarjetaPrestamo[],
          );
        }

        if (resultadoSobrantes.error) {
          setMensajeError(
            "No se pudieron cargar los sobrantes: " +
              resultadoSobrantes.error.message,
          );
          setSobrantes([]);
        } else {
          setSobrantes(
            (resultadoSobrantes.data || []) as SobrantePrestamo[],
          );
        }

        if (resultadoVentasGarantia.error) {
          setMensajeError(
            "No se pudieron cargar las ventas de garantías: " +
              resultadoVentasGarantia.error.message,
          );
          setVentasGarantia([]);
        } else {
          setVentasGarantia(
            (resultadoVentasGarantia.data || []) as VentaGarantiaPrestamo[],
          );
        }
 
        setCargando(false);
      }
 
      void cargarPrestamo();
    },
    [prestamoId, supabase],
  );
 
  const resumenPagos = useMemo(
    function calcularResumenPagos() {
      return pagos
        .filter((pago) => pago.status !== "cancelled")
        .reduce(
          (resumen, pago) => {
            resumen.total += Number(pago.amount);
            resumen.capital += Number(
              pago.principal_amount,
            );
            resumen.interes += Number(
              pago.interest_amount,
            );
            resumen.mora += Number(
              pago.late_fee_amount,
            );
            return resumen;
          },
          {
            total: 0,
            capital: 0,
            interes: 0,
            mora: 0,
          },
        );
    },
    [pagos],
  );
 
  const resumenCuotas = useMemo(
    function calcularResumenCuotas() {
      return cuotasReales.reduce(
        (resumen, cuota) => {
          if (cuota.status === "paid") resumen.pagadas += 1;
          if (cuota.status === "partial") resumen.parciales += 1;
          if (cuota.status === "overdue") resumen.vencidas += 1;
          if (cuota.status === "pending") resumen.pendientes += 1;
 
          resumen.capitalPendiente += Math.max(
            0,
            Number(cuota.principal_due) -
              Number(cuota.principal_paid),
          );
          resumen.interesPendiente += Math.max(
            0,
            Number(cuota.interest_due) -
              Number(cuota.interest_paid),
          );
          resumen.moraPendiente += Math.max(
            0,
            Number(cuota.late_fee_due) -
              Number(cuota.late_fee_paid),
          );
 
          return resumen;
        },
        {
          pagadas: 0,
          parciales: 0,
          vencidas: 0,
          pendientes: 0,
          capitalPendiente: 0,
          interesPendiente: 0,
          moraPendiente: 0,
        },
      );
    },
    [cuotasReales],
  );
 
  const cronograma = useMemo(
    function generarCronograma() {
      if (!prestamo) return [];
 
      const periodos = Math.max(
        1,
        Number(prestamo.term_count),
      );
      const capitalPorPeriodo =
        Number(prestamo.principal_amount) / periodos;
      const interesPorPeriodo =
        Number(prestamo.principal_amount) *
        (Number(prestamo.interest_rate) / 100);
 
      const cuotas: CuotaProyectada[] = [];
 
      for (let indice = 1; indice <= periodos; indice += 1) {
        const fecha = sumarPeriodos(
          prestamo.start_date,
          prestamo.interest_frequency,
          indice,
        );
 
        cuotas.push({
          numero: indice,
          fecha,
          capital: capitalPorPeriodo,
          interes: interesPorPeriodo,
          total:
            capitalPorPeriodo + interesPorPeriodo,
        });
      }
 
      return cuotas;
    },
    [prestamo],
  );
 

  const expedientePrestamo = useMemo(
    function construirExpedientePrestamo() {
      if (!prestamo) return [];

      const eventos: EventoExpedientePrestamo[] = [
        {
          id: `prestamo-${prestamo.id}`,
          fecha: `${prestamo.start_date}T12:00:00`,
          titulo: "Préstamo creado",
          descripcion:
            `Se registró el préstamo ${prestamo.loan_number} por ` +
            `${prestamo.currencies?.symbol || ""} ` +
            `${Number(prestamo.principal_amount).toLocaleString("es-DO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}.`,
          categoria: "prestamo",
          monto: Number(prestamo.principal_amount),
        },
      ];

      pagos
        .filter((pago) => pago.status !== "cancelled")
        .forEach((pago) => {
          eventos.push({
            id: `pago-${pago.id}`,
            fecha: pago.payment_date,
            titulo: `Pago registrado · ${pago.payment_number}`,
            descripcion:
              `Capital: ${formatearMonto(Number(pago.principal_amount))}. ` +
              `Interés: ${formatearMonto(Number(pago.interest_amount))}. ` +
              `Mora: ${formatearMonto(Number(pago.late_fee_amount))}. ` +
              `Método: ${obtenerMetodoPago(pago.payment_method)}.`,
            categoria: "pago",
            monto: Number(pago.amount),
          });
        });

      if (detalleTarjeta?.custody_received_at) {
        eventos.push({
          id: `tarjeta-recibida-${detalleTarjeta.id}`,
          fecha: detalleTarjeta.custody_received_at,
          titulo: "Tarjeta recibida en custodia",
          descripcion:
            `${detalleTarjeta.bank_name} · **** ${detalleTarjeta.card_last_four} · ` +
            `Titular: ${detalleTarjeta.cardholder_name}.`,
          categoria: "tarjeta",
        });
      }

      if (detalleTarjeta?.returned_at) {
        eventos.push({
          id: `tarjeta-devuelta-${detalleTarjeta.id}`,
          fecha: detalleTarjeta.returned_at,
          titulo: "Tarjeta devuelta",
          descripcion:
            `${detalleTarjeta.bank_name} · **** ${detalleTarjeta.card_last_four}.`,
          categoria: "tarjeta",
        });
      }

      retirosTarjeta
        .filter((retiro) => retiro.status !== "cancelled")
        .forEach((retiro) => {
          eventos.push({
            id: `retiro-tarjeta-${retiro.id}`,
            fecha: retiro.collection_date,
            titulo: "Retiro realizado con tarjeta",
            descripcion:
              `Retirado: ${formatearMonto(Number(retiro.withdrawn_amount))}. ` +
              `Aplicado al préstamo: ${formatearMonto(Number(retiro.payment_applied))}. ` +
              `Comisión: ${formatearMonto(Number(retiro.bank_fee))}. ` +
              `Sobrante: ${formatearMonto(Number(retiro.client_surplus))}.` +
              (retiro.reference_number
                ? ` Referencia: ${retiro.reference_number}.`
                : ""),
            categoria: "tarjeta",
            monto: Number(retiro.withdrawn_amount),
          });
        });

      cierresTarjeta
        .filter((cierre) => cierre.status !== "cancelled")
        .forEach((cierre) => {
          eventos.push({
            id: `cierre-tarjeta-${cierre.id}`,
            fecha: cierre.closed_at,
            titulo: `Cierre de tarjetas · ${cierre.closure_number}`,
            descripcion:
              `Período ${formatearFecha(cierre.period_start)} al ` +
              `${formatearFecha(cierre.period_end)}.`,
            categoria: "cierre",
          });
        });

      sobrantes
        .filter((sobrante) => sobrante.status !== "cancelled")
        .forEach((sobrante) => {
          eventos.push({
            id: `sobrante-generado-${sobrante.id}`,
            fecha: sobrante.created_at,
            titulo: "Sobrante de tarjeta generado",
            descripcion:
              `Monto original: ${formatearMonto(Number(sobrante.original_amount))}. ` +
              `Entregado: ${formatearMonto(Number(sobrante.delivered_amount))}. ` +
              `Pendiente: ${formatearMonto(Number(sobrante.pending_amount))}.`,
            categoria: "sobrante",
            monto: Number(sobrante.original_amount),
          });

          if (sobrante.delivered_at) {
            eventos.push({
              id: `sobrante-entregado-${sobrante.id}`,
              fecha: sobrante.delivered_at,
              titulo: "Sobrante entregado",
              descripcion:
                `Entregado: ${formatearMonto(Number(sobrante.delivered_amount))}. ` +
                `Recibido por: ${sobrante.delivered_to || "No indicado"}.` +
                (sobrante.delivery_reference
                  ? ` Referencia: ${sobrante.delivery_reference}.`
                  : ""),
              categoria: "sobrante",
              monto: Number(sobrante.delivered_amount),
            });
          }
        });

      ventasGarantia
        .filter((venta) => venta.status !== "cancelled")
        .forEach((venta) => {
          eventos.push({
            id: `venta-garantia-${venta.id}`,
            fecha: venta.sale_date,
            titulo: `Garantía vendida · ${venta.sale_number}`,
            descripcion:
              `Comprador: ${venta.buyer_name}. ` +
              `Venta bruta: ${formatearMonto(Number(venta.gross_sale_amount))}. ` +
              `Gastos: ${formatearMonto(Number(venta.total_expenses))}. ` +
              `Ingreso neto: ${formatearMonto(Number(venta.net_sale_amount))}. ` +
              `Aplicado al préstamo: ${formatearMonto(Number(venta.amount_applied_to_loan))}. ` +
              `Remanente: ${formatearMonto(Number(venta.remaining_amount))}.`,
            categoria: "venta",
            monto: Number(venta.net_sale_amount),
          });
        });

      garantias.forEach((garantia) => {
        eventos.push({
          id: `garantia-recibida-${garantia.id}`,
          fecha: `${garantia.received_date}T12:00:00`,
          titulo: "Garantía recibida",
          descripcion:
            `${obtenerTipoGarantia(garantia.collateral_type)} · ` +
            `${garantia.description}. Estado: ` +
            `${obtenerEstadoGarantia(garantia.collateral_status)}.`,
          categoria: "garantia",
        });

        if (garantia.released_at) {
          eventos.push({
            id: `garantia-liberada-${garantia.id}`,
            fecha: garantia.released_at,
            titulo: "Garantía liberada",
            descripcion: garantia.description,
            categoria: "garantia",
          });
        }

        if (garantia.returned_at) {
          eventos.push({
            id: `garantia-devuelta-${garantia.id}`,
            fecha: garantia.returned_at,
            titulo: "Garantía devuelta",
            descripcion: garantia.description,
            categoria: "garantia",
          });
        }

        if (garantia.executed_at) {
          eventos.push({
            id: `garantia-ejecutada-${garantia.id}`,
            fecha: garantia.executed_at,
            titulo: "Garantía ejecutada",
            descripcion: garantia.description,
            categoria: "garantia",
          });
        }
      });

      return eventos.sort(
        (a, b) =>
          new Date(b.fecha).getTime() -
          new Date(a.fecha).getTime(),
      );
    },
    [
      prestamo,
      pagos,
      detalleTarjeta,
      retirosTarjeta,
      cierresTarjeta,
      sobrantes,
      garantias,
      ventasGarantia,
    ],
  );

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-gray-600">
          Cargando información del préstamo...
        </p>
      </main>
    );
  }
 
  if (!prestamo) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-red-700">
            No se pudo abrir el préstamo
          </h1>
          <p className="mt-3 text-gray-700">
            {mensajeError ||
              "El préstamo no fue encontrado."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/prestamos")}
            className="mt-5 rounded-lg bg-blue-900 px-5 py-3 font-medium text-white"
          >
            Volver a préstamos
          </button>
        </div>
      </main>
    );
  }
 
  const totalPendiente =
    Number(prestamo.principal_balance) +
    Number(prestamo.interest_balance) +
    Number(prestamo.late_fee_balance);
 
  const totalOriginal =
    Number(prestamo.principal_amount) +
    Number(prestamo.principal_amount) *
      (Number(prestamo.interest_rate) / 100) *
      Math.max(1, Number(prestamo.term_count));
 
  const porcentajePagado =
    totalOriginal > 0
      ? Math.min(
          100,
          (resumenPagos.total / totalOriginal) * 100,
        )
      : 0;
 
  const proximaCuotaReal =
    cuotasReales.find(
      (cuota) =>
        cuota.status === "pending" ||
        cuota.status === "partial" ||
        cuota.status === "overdue",
    ) || null;
 
  const proximaCuotaProyectada =
    cronograma.find(
      (cuota) =>
        new Date(cuota.fecha + "T23:59:59") >=
        new Date(),
    ) || null;
 
  function formatearMonto(monto: number) {
    const simbolo =
      prestamo?.currencies?.symbol || "";
 
    return (
      simbolo +
      " " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
 
  function imprimirDesembolso() {
    const prestamoActual = prestamo;
 
    if (!prestamoActual) {
      window.alert("No se pudo cargar la información del préstamo.");
      return;
    }
 
    const ventana = window.open(
      "",
      "_blank",
      "width=760,height=850",
    );
 
    if (!ventana) {
      window.alert(
        "El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo nuevamente.",
      );
      return;
    }
 
    const cliente = prestamoActual.clients
      ? `${prestamoActual.clients.first_name} ${prestamoActual.clients.last_name}`
      : "Cliente no disponible";
 
    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Comprobante de desembolso</title>
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
            p { margin: 5px 0; }
            hr {
              border: 0;
              border-top: 1px solid #111827;
              margin: 12px 0;
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
            <h2>COMPROBANTE DE DESEMBOLSO</h2>
            <hr />
            <p><strong>Préstamo:</strong> ${prestamoActual.loan_number}</p>
            <p><strong>Cliente:</strong> ${cliente}</p>
            <p><strong>Cédula:</strong> ${prestamoActual.clients?.document_number || "—"}</p>
            <p><strong>Fecha:</strong> ${formatearFecha(prestamoActual.start_date)}</p>
            <p><strong>Tipo:</strong> ${obtenerTipo(prestamoActual.loan_type)}</p>
            <p><strong>Frecuencia:</strong> ${obtenerFrecuencia(prestamoActual.interest_frequency)}</p>
            <p><strong>Tasa:</strong> ${prestamoActual.interest_rate}%</p>
            <p><strong>Períodos:</strong> ${prestamoActual.term_count}</p>
            <hr />
            <p><strong>Capital entregado:</strong> ${formatearMonto(prestamoActual.principal_amount)}</p>
            <p><strong>Fecha de vencimiento:</strong> ${formatearFecha(prestamoActual.due_date)}</p>
            <hr />
            <p><strong>Observaciones:</strong> ${prestamoActual.notes || "Ninguna"}</p>
            <div class="firma">
              _______________________________<br />
              Firma del cliente
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
        <button
          type="button"
          onClick={() => router.push("/prestamos")}
          className="font-medium text-blue-900 hover:underline"
        >
          ← Volver a préstamos
        </button>
 
        {mensajeError !== "" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensajeError}
          </div>
        )}
 
        <section className="mt-4 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-blue-900">
                  {prestamo.loan_number}
                </h1>
                <span
                  className={obtenerClaseEstado(
                    prestamo.status,
                  )}
                >
                  {obtenerEstado(prestamo.status)}
                </span>
              </div>
              <p className="mt-2 text-gray-600">
                {prestamo.clients
                  ? `${prestamo.clients.first_name} ${prestamo.clients.last_name}`
                  : "Cliente no disponible"}
              </p>
            </div>
 
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/cobros?loanId=" + prestamo.id,
                  )
                }
                className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
              >
                Registrar pago
              </button>
 
              <button
                type="button"
                onClick={imprimirDesembolso}
                className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
              >
                Imprimir desembolso
              </button>
            </div>
          </div>
        </section>
 
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Tarjeta
            titulo="Capital original"
            valor={formatearMonto(
              prestamo.principal_amount,
            )}
            clase="text-gray-900"
          />
          <Tarjeta
            titulo="Capital pendiente"
            valor={formatearMonto(
              prestamo.principal_balance,
            )}
            clase="text-blue-900"
          />
          <Tarjeta
            titulo="Interés pendiente"
            valor={formatearMonto(
              prestamo.interest_balance,
            )}
            clase="text-amber-700"
          />
          <Tarjeta
            titulo="Total pendiente"
            valor={formatearMonto(totalPendiente)}
            clase="text-red-700"
          />
        </section>
 
        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Progreso del préstamo
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Total pagado:{" "}
                {formatearMonto(resumenPagos.total)}
              </p>
            </div>
 
            <div className="text-left lg:text-right">
              <p className="text-3xl font-bold text-blue-900">
                {porcentajePagado.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">
                del total proyectado
              </p>
            </div>
          </div>
 
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-700"
              style={{
                width: `${porcentajePagado}%`,
              }}
            />
          </div>
 
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <ResumenPago
              titulo="Capital abonado"
              valor={formatearMonto(
                resumenPagos.capital,
              )}
            />
            <ResumenPago
              titulo="Interés cobrado"
              valor={formatearMonto(
                resumenPagos.interes,
              )}
            />
            <ResumenPago
              titulo="Mora cobrada"
              valor={formatearMonto(resumenPagos.mora)}
            />
            <ResumenPago
              titulo="Cantidad de pagos"
              valor={String(pagos.length)}
            />
          </div>
        </section>
 
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
            <h2 className="text-xl font-bold text-blue-900">
              Próxima cuota proyectada
            </h2>
 
            {proximaCuotaReal ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <ResumenPago
                  titulo="Cuota"
                  valor={`#${proximaCuotaReal.installment_number}`}
                />
                <ResumenPago
                  titulo="Fecha"
                  valor={formatearFecha(
                    proximaCuotaReal.due_date,
                  )}
                />
                <ResumenPago
                  titulo="Capital pendiente"
                  valor={formatearMonto(
                    Math.max(
                      0,
                      Number(proximaCuotaReal.principal_due) -
                        Number(proximaCuotaReal.principal_paid),
                    ),
                  )}
                />
                <ResumenPago
                  titulo="Total pendiente"
                  valor={formatearMonto(
                    Math.max(
                      0,
                      Number(proximaCuotaReal.principal_due) -
                        Number(proximaCuotaReal.principal_paid),
                    ) +
                      Math.max(
                        0,
                        Number(proximaCuotaReal.interest_due) -
                          Number(proximaCuotaReal.interest_paid),
                      ) +
                      Math.max(
                        0,
                        Number(proximaCuotaReal.late_fee_due) -
                          Number(proximaCuotaReal.late_fee_paid),
                      ),
                  )}
                />
              </div>
            ) : proximaCuotaProyectada ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <ResumenPago
                  titulo="Cuota proyectada"
                  valor={`#${proximaCuotaProyectada.numero}`}
                />
                <ResumenPago
                  titulo="Fecha"
                  valor={formatearFecha(
                    proximaCuotaProyectada.fecha,
                  )}
                />
                <ResumenPago
                  titulo="Capital"
                  valor={formatearMonto(
                    proximaCuotaProyectada.capital,
                  )}
                />
                <ResumenPago
                  titulo="Total estimado"
                  valor={formatearMonto(
                    proximaCuotaProyectada.total,
                  )}
                />
              </div>
            ) : (
              <p className="mt-4 text-gray-600">
                No hay cuotas pendientes.
              </p>
            )}
          </div>
 
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Estado de vencimiento
            </h2>
            <p className="mt-4 text-3xl font-bold text-gray-900">
              {obtenerDiasRestantes(prestamo.due_date)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Fecha final:{" "}
              {formatearFecha(prestamo.due_date)}
            </p>
          </div>
        </section>
 
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Datos del cliente
            </h2>
            <div className="mt-5 space-y-4">
              <Fila
                etiqueta="Nombre"
                valor={
                  prestamo.clients
                    ? `${prestamo.clients.first_name} ${prestamo.clients.last_name}`
                    : "—"
                }
              />
              <Fila
                etiqueta="Cédula"
                valor={
                  prestamo.clients?.document_number ||
                  "—"
                }
              />
              <Fila
                etiqueta="Teléfono"
                valor={
                  prestamo.clients?.phone_primary || "—"
                }
                sinBorde
              />
            </div>
          </div>
 
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Datos del préstamo
            </h2>
            <div className="mt-5 space-y-4">
              <Fila
                etiqueta="Tipo"
                valor={obtenerTipo(
                  prestamo.loan_type,
                )}
              />
              <Fila
                etiqueta="Moneda"
                valor={
                  prestamo.currencies?.code || "—"
                }
              />
              <Fila
                etiqueta="Tasa de interés"
                valor={`${prestamo.interest_rate}%`}
              />
              <Fila
                etiqueta="Frecuencia"
                valor={obtenerFrecuencia(
                  prestamo.interest_frequency,
                )}
              />
              <Fila
                etiqueta="Períodos"
                valor={String(prestamo.term_count)}
              />
              <Fila
                etiqueta="Fecha de inicio"
                valor={formatearFecha(
                  prestamo.start_date,
                )}
              />
              <Fila
                etiqueta="Fecha de vencimiento"
                valor={formatearFecha(
                  prestamo.due_date,
                )}
              />
              <Fila
                etiqueta="Mora pendiente"
                valor={formatearMonto(
                  prestamo.late_fee_balance,
                )}
                sinBorde
              />
            </div>
          </div>
        </section>
 
        {prestamo.loan_type === "card" && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-blue-900">
                  Información de la tarjeta
                </h2>
                <p className="mt-1 text-sm text-blue-800">
                  Datos de custodia y organización del cobro.
                </p>
              </div>
 
              {detalleTarjeta && (
                <span className={obtenerClaseEstadoTarjeta(detalleTarjeta.card_status)}>
                  {obtenerEstadoTarjeta(detalleTarjeta.card_status)}
                </span>
              )}
            </div>
 
            {detalleTarjeta ? (
              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-5">
                  <h3 className="font-bold text-blue-900">
                    Tarjeta y titular
                  </h3>
                  <div className="mt-4 space-y-3">
                    <Fila etiqueta="Banco" valor={detalleTarjeta.bank_name} />
                    <Fila
                      etiqueta="Tarjeta"
                      valor={`**** ${detalleTarjeta.card_last_four}`}
                    />
                    <Fila
                      etiqueta="Titular"
                      valor={detalleTarjeta.cardholder_name}
                    />
                    <Fila
                      etiqueta="Recibida en custodia"
                      valor={formatearFechaHoraOpcional(
                        detalleTarjeta.custody_received_at,
                      )}
                      sinBorde
                    />
                  </div>
                </div>
 
                <div className="rounded-xl bg-white p-5">
                  <h3 className="font-bold text-blue-900">
                    Organización del cobro
                  </h3>
                  <div className="mt-4 space-y-3">
                    <Fila
                      etiqueta="Frecuencia"
                      valor={obtenerFrecuencia(
                        detalleTarjeta.collection_frequency,
                      )}
                    />
                    <Fila
                      etiqueta="Día habitual"
                      valor={obtenerDescripcionCobro(detalleTarjeta)}
                    />
                    <Fila
                      etiqueta="Próximo cobro"
                      valor={formatearFecha(
                        detalleTarjeta.next_collection_date,
                      )}
                    />
                    <Fila
                      etiqueta="Sector"
                      valor={detalleTarjeta.work_sector || "—"}
                      sinBorde
                    />
                  </div>
                </div>
 
                <div className="rounded-xl bg-white p-5 lg:col-span-2">
                  <h3 className="font-bold text-blue-900">
                    Información laboral
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Fila
                      etiqueta="Empresa"
                      valor={detalleTarjeta.employer_name || "—"}
                    />
                    <Fila
                      etiqueta="Ubicación"
                      valor={detalleTarjeta.work_location || "—"}
                    />
                    <Fila
                      etiqueta="Cargo"
                      valor={detalleTarjeta.job_position || "—"}
                    />
                    <Fila
                      etiqueta="Salario estimado"
                      valor={
                        detalleTarjeta.estimated_salary === null
                          ? "—"
                          : formatearMonto(detalleTarjeta.estimated_salary)
                      }
                      sinBorde
                    />
                  </div>
                </div>
 
                {detalleTarjeta.notes && (
                  <div className="rounded-xl bg-white p-5 lg:col-span-2">
                    <h3 className="font-bold text-blue-900">
                      Observaciones de la tarjeta
                    </h3>
                    <p className="mt-3 text-gray-700">
                      {detalleTarjeta.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                Este préstamo está marcado como “Con tarjeta”, pero no se encontró su ficha en
                loan_card_details.
              </div>
            )}
          </section>
        )}
 
        {prestamo.loan_type === "collateral" && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-amber-900">
                  Garantías del préstamo
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  Inventario y estado de los bienes o documentos recibidos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/garantias")}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Abrir módulo de garantías
              </button>
            </div>
 
            {garantias.length > 0 ? (
              <div className="mt-5 space-y-5">
                {garantias.map((garantia, indice) => (
                  <div
                    key={garantia.id}
                    className="rounded-xl bg-white p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          Garantía #{indice + 1}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-amber-900">
                          {obtenerTipoGarantia(garantia.collateral_type)}
                        </h3>
                        <p className="mt-1 text-gray-700">
                          {garantia.description}
                        </p>
                      </div>
 
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span className={obtenerClaseEstadoGarantia(garantia.collateral_status)}>
                          {obtenerEstadoGarantia(garantia.collateral_status)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            router.push("/garantias/" + garantia.id)
                          }
                          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                        >
                          Ver expediente
                        </button>
                      </div>
                    </div>
 
                    <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      <Fila
                        etiqueta="Marca y modelo"
                        valor={
                          [garantia.brand, garantia.model]
                            .filter(Boolean)
                            .join(" ") || "—"
                        }
                      />
                      <Fila
                        etiqueta="Año"
                        valor={
                          garantia.manufacture_year
                            ? String(garantia.manufacture_year)
                            : "—"
                        }
                      />
                      <Fila
                        etiqueta="Matrícula o registro"
                        valor={garantia.registration_number || "—"}
                      />
                      <Fila
                        etiqueta="Placa"
                        valor={garantia.plate_number || "—"}
                      />
                      <Fila
                        etiqueta="Chasis"
                        valor={garantia.chassis_number || "—"}
                      />
                      <Fila
                        etiqueta="Número de título"
                        valor={garantia.title_number || "—"}
                      />
                      <Fila
                        etiqueta="Número de serie"
                        valor={garantia.serial_number || "—"}
                      />
                      <Fila
                        etiqueta="Condición"
                        valor={garantia.physical_condition || "—"}
                      />
                      <Fila
                        etiqueta="Valor estimado"
                        valor={
                          garantia.estimated_value === null
                            ? "—"
                            : formatearMonto(garantia.estimated_value)
                        }
                      />
                      <Fila
                        etiqueta="Valor aceptado"
                        valor={
                          garantia.accepted_value === null
                            ? "—"
                            : formatearMonto(garantia.accepted_value)
                        }
                      />
                      <Fila
                        etiqueta="Lugar de resguardo"
                        valor={garantia.storage_location || "—"}
                      />
                      <Fila
                        etiqueta="Fecha de recepción"
                        valor={formatearFecha(garantia.received_date)}
                        sinBorde
                      />
                    </div>
 
                    {garantia.notes && (
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-gray-700">
                          Observaciones
                        </p>
                        <p className="mt-1 text-gray-700">
                          {garantia.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <p>
                  Este préstamo está marcado como “Con garantía”, pero no se encontró una garantía
                  relacionada en loan_collaterals.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/garantias")}
                  className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                >
                  Ir a registrar o revisar garantías
                </button>
              </div>
            )}
          </section>
        )}
 
        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                {cuotasReales.length > 0
                  ? "Cronograma real de cuotas"
                  : "Cronograma proyectado"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {cuotasReales.length > 0
                  ? "Las cuotas se cargan directamente desde Supabase."
                  : "Este cronograma es informativo porque el préstamo fue creado antes de habilitar las cuotas reales."}
              </p>
            </div>
 
            {cuotasReales.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniEstado titulo="Pagadas" valor={resumenCuotas.pagadas} />
                <MiniEstado titulo="Parciales" valor={resumenCuotas.parciales} />
                <MiniEstado titulo="Vencidas" valor={resumenCuotas.vencidas} />
                <MiniEstado titulo="Pendientes" valor={resumenCuotas.pendientes} />
              </div>
            )}
          </div>
 
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {(cuotasReales.length > 0
                    ? [
                        "Cuota",
                        "Fecha",
                        "Capital",
                        "Interés",
                        "Mora",
                        "Pagado",
                        "Pendiente",
                        "Estado",
                      ]
                    : [
                        "Cuota",
                        "Fecha",
                        "Capital",
                        "Interés",
                        "Total estimado",
                      ]
                  ).map((titulo) => (
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
                {cuotasReales.length > 0
                  ? cuotasReales.map((cuota) => {
                      const pagado =
                        Number(cuota.principal_paid) +
                        Number(cuota.interest_paid) +
                        Number(cuota.late_fee_paid);
                      const pendiente =
                        Math.max(
                          0,
                          Number(cuota.principal_due) -
                            Number(cuota.principal_paid),
                        ) +
                        Math.max(
                          0,
                          Number(cuota.interest_due) -
                            Number(cuota.interest_paid),
                        ) +
                        Math.max(
                          0,
                          Number(cuota.late_fee_due) -
                            Number(cuota.late_fee_paid),
                        );
 
                      return (
                        <tr key={cuota.id}>
                          <td className="px-4 py-4 text-sm font-semibold text-blue-900">
                            #{cuota.installment_number}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {formatearFecha(cuota.due_date)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {formatearMonto(cuota.principal_due)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {formatearMonto(cuota.interest_due)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {formatearMonto(cuota.late_fee_due)}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-green-700">
                            {formatearMonto(pagado)}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-red-700">
                            {formatearMonto(pendiente)}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={obtenerClaseCuota(cuota.status)}>
                              {obtenerEstadoCuota(cuota.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  : cronograma.map((cuota) => (
                      <tr key={cuota.numero}>
                        <td className="px-4 py-4 text-sm font-semibold text-blue-900">
                          #{cuota.numero}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {formatearFecha(cuota.fecha)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {formatearMonto(cuota.capital)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {formatearMonto(cuota.interes)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {formatearMonto(cuota.total)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>
 
        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Observaciones
          </h2>
          <p className="mt-4 text-gray-700">
            {prestamo.notes ||
              "Este préstamo no tiene observaciones."}
          </p>
        </section>
 
        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Expediente del préstamo
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Línea de tiempo integrada con préstamo, pagos, tarjeta y garantías.
              </p>
            </div>

            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              {expedientePrestamo.length} evento(s)
            </span>
          </div>

          {expedientePrestamo.length === 0 ? (
            <p className="mt-5 text-gray-500">
              Todavía no hay eventos registrados.
            </p>
          ) : (
            <div className="mt-6 space-y-0">
              {expedientePrestamo.map((evento, indice) => (
                <div
                  key={evento.id}
                  className="relative flex gap-4 pb-7"
                >
                  {indice < expedientePrestamo.length - 1 && (
                    <div className="absolute left-[11px] top-7 h-full w-0.5 bg-slate-200" />
                  )}

                  <div
                    className={
                      evento.categoria === "pago"
                        ? "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-green-600 shadow"
                        : evento.categoria === "garantia"
                          ? "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-amber-600 shadow"
                          : evento.categoria === "tarjeta"
                            ? "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-purple-600 shadow"
                            : evento.categoria === "cierre"
                              ? "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-indigo-600 shadow"
                              : evento.categoria === "sobrante"
                                ? "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-cyan-600 shadow"
                                : evento.categoria === "venta"
                                  ? "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-red-700 shadow"
                                  : "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-blue-700 shadow"
                    }
                  />

                  <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {evento.titulo}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {evento.descripcion}
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-sm font-semibold text-blue-900">
                          {formatearFechaHora(evento.fecha)}
                        </p>

                        {typeof evento.monto === "number" && (
                          <p className="mt-1 text-sm font-bold text-green-700">
                            {formatearMonto(evento.monto)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Historial de pagos
          </h2>
 
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Recibo",
                    "Fecha",
                    "Monto",
                    "Capital",
                    "Interés",
                    "Mora",
                    "Método",
                    "Estado",
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
                {pagos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Este préstamo todavía no tiene pagos.
                    </td>
                  </tr>
                ) : (
                  pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-blue-900">
                        {pago.payment_number}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearFechaHora(
                          pago.payment_date,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                        {formatearMonto(pago.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearMonto(
                          pago.principal_amount,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearMonto(
                          pago.interest_amount,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearMonto(
                          pago.late_fee_amount,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {obtenerMetodoPago(
                          pago.payment_method,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        {pago.status === "posted"
                          ? "Aplicado"
                          : pago.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
 
function Tarjeta({
  titulo,
  valor,
  clase,
}: {
  titulo: string;
  valor: string;
  clase: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm text-gray-500">
        {titulo}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${clase}`}
      >
        {valor}
      </p>
    </div>
  );
}
 
function ResumenPago({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-gray-500">
        {titulo}
      </p>
      <p className="mt-1 font-bold text-gray-900">
        {valor}
      </p>
    </div>
  );
}
 
function Fila({
  etiqueta,
  valor,
  sinBorde = false,
}: {
  etiqueta: string;
  valor: string;
  sinBorde?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        sinBorde ? "" : "border-b pb-3"
      }`}
    >
      <span className="text-gray-500">
        {etiqueta}
      </span>
      <span className="text-right font-medium text-gray-900">
        {valor}
      </span>
    </div>
  );
}
 
function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
 
  return new Date(
    fecha + "T12:00:00",
  ).toLocaleDateString("es-DO");
}
 
function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
 
function obtenerTipo(tipo: string) {
  if (tipo === "personal") return "Personal";
  if (tipo === "card") return "Con tarjeta";
  if (tipo === "collateral") return "Con garantía";
  if (tipo === "pawn") return "Empeño";
  return tipo;
}
 
function obtenerFrecuencia(frecuencia: string) {
  if (frecuencia === "weekly") return "Semanal";
  if (frecuencia === "biweekly") return "Quincenal";
  if (frecuencia === "monthly") return "Mensual";
  return frecuencia;
}
 
function obtenerEstado(estado: string) {
  if (estado === "active") return "Activo";
  if (estado === "overdue") return "Vencido";
  if (estado === "paid") return "Pagado";
  if (estado === "draft") return "Borrador";
  if (estado === "approved") return "Aprobado";
  if (estado === "cancelled") return "Cancelado";
  return estado;
}
 
function obtenerClaseEstado(estado: string) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-sm font-semibold ";
 
  if (estado === "active") {
    return base + "bg-green-100 text-green-800";
  }
 
  if (estado === "overdue") {
    return base + "bg-red-100 text-red-800";
  }
 
  if (estado === "paid") {
    return base + "bg-blue-100 text-blue-800";
  }
 
  return base + "bg-gray-100 text-gray-700";
}
 
function obtenerMetodoPago(metodo: string) {
  if (metodo === "cash") return "Efectivo";
  if (metodo === "transfer") return "Transferencia";
  if (metodo === "deposit") return "Depósito";
  if (metodo === "check") return "Cheque";
  if (metodo === "card_withdrawal") {
    return "Retiro con tarjeta";
  }
  return "Otro";
}
 
function formatearFechaHoraOpcional(fecha: string | null) {
  if (!fecha) return "—";
 
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
 
function obtenerDescripcionCobro(detalle: DetalleTarjeta) {
  if (detalle.collection_frequency === "weekly") {
    return obtenerDiaSemana(detalle.collection_weekday);
  }
 
  if (detalle.collection_frequency === "biweekly") {
    const dias = [detalle.collection_day_1, detalle.collection_day_2]
      .filter((dia): dia is number => dia !== null)
      .join(" y ");
 
    return dias === "" ? "—" : `Días ${dias}`;
  }
 
  return detalle.collection_day_1 === null
    ? "—"
    : `Día ${detalle.collection_day_1}`;
}
 
function obtenerDiaSemana(dia: string | null) {
  if (dia === "monday") return "Lunes";
  if (dia === "tuesday") return "Martes";
  if (dia === "wednesday") return "Miércoles";
  if (dia === "thursday") return "Jueves";
  if (dia === "friday") return "Viernes";
  if (dia === "saturday") return "Sábado";
  if (dia === "sunday") return "Domingo";
  return "—";
}
 
function obtenerEstadoTarjeta(estado: string) {
  if (estado === "in_custody") return "En custodia";
  if (estado === "active") return "Activa";
  if (estado === "temporarily_returned") return "Devuelta temporalmente";
  if (estado === "returned") return "Devuelta";
  if (estado === "blocked") return "Bloqueada";
  if (estado === "lost") return "Extraviada";
  if (estado === "cancelled") return "Cancelada";
  return estado;
}
 
function obtenerClaseEstadoTarjeta(estado: string) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-sm font-semibold ";
 
  if (estado === "in_custody" || estado === "active") {
    return base + "bg-green-100 text-green-800";
  }
 
  if (estado === "blocked" || estado === "lost") {
    return base + "bg-red-100 text-red-800";
  }
 
  if (estado === "temporarily_returned") {
    return base + "bg-amber-100 text-amber-800";
  }
 
  return base + "bg-gray-200 text-gray-700";
}
 
function obtenerTipoGarantia(tipo: string) {
  if (tipo === "vehicle") return "Vehículo";
  if (tipo === "jewelry") return "Prenda o joya";
  if (tipo === "article") return "Artículo";
  if (tipo === "appliance") return "Electrodoméstico";
  if (tipo === "property_title") return "Título de propiedad";
  if (tipo === "land") return "Terreno o solar";
  if (tipo === "house") return "Vivienda";
  if (tipo === "registration") return "Matrícula";
  if (tipo === "legal_document") return "Documento legal";
  return "Otra garantía";
}
 
function obtenerEstadoGarantia(estado: string) {
  if (estado === "received") return "Recibida";
  if (estado === "stored") return "En resguardo";
  if (estado === "released") return "Liberada";
  if (estado === "returned") return "Devuelta";
  if (estado === "executed") return "Ejecutada";
  if (estado === "sold") return "Vendida";
  if (estado === "lost") return "Extraviada";
  if (estado === "cancelled") return "Cancelada";
  return estado;
}
 
function obtenerClaseEstadoGarantia(estado: string) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-sm font-semibold ";
 
  if (estado === "received" || estado === "stored") {
    return base + "bg-amber-100 text-amber-800";
  }
 
  if (estado === "released" || estado === "returned") {
    return base + "bg-green-100 text-green-800";
  }
 
  if (estado === "executed" || estado === "sold") {
    return base + "bg-red-100 text-red-800";
  }
 
  return base + "bg-gray-200 text-gray-700";
}
 
function MiniEstado({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 text-center">
      <p className="text-xs text-gray-500">{titulo}</p>
      <p className="font-bold text-blue-900">{valor}</p>
    </div>
  );
}
 
function obtenerEstadoCuota(estado: CuotaReal["status"]) {
  if (estado === "pending") return "Pendiente";
  if (estado === "partial") return "Parcial";
  if (estado === "paid") return "Pagada";
  if (estado === "overdue") return "Vencida";
  return "Cancelada";
}
 
function obtenerClaseCuota(estado: CuotaReal["status"]) {
  const base =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ";
 
  if (estado === "paid") {
    return base + "bg-green-100 text-green-800";
  }
 
  if (estado === "partial") {
    return base + "bg-blue-100 text-blue-800";
  }
 
  if (estado === "overdue") {
    return base + "bg-red-100 text-red-800";
  }
 
  if (estado === "cancelled") {
    return base + "bg-gray-200 text-gray-700";
  }
 
  return base + "bg-amber-100 text-amber-800";
}
 
function sumarPeriodos(
  fechaInicial: string,
  frecuencia: string,
  cantidad: number,
) {
  const fecha = new Date(fechaInicial + "T12:00:00");
 
  if (frecuencia === "weekly") {
    fecha.setDate(fecha.getDate() + cantidad * 7);
  } else if (frecuencia === "biweekly") {
    fecha.setDate(fecha.getDate() + cantidad * 15);
  } else {
    fecha.setMonth(fecha.getMonth() + cantidad);
  }
 
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(
    2,
    "0",
  );
  const dia = String(fecha.getDate()).padStart(
    2,
    "0",
  );
 
  return `${anio}-${mes}-${dia}`;
}
 
function obtenerDiasRestantes(fecha: string | null) {
  if (!fecha) return "Sin fecha";
 
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
 
  const vencimiento = new Date(
    fecha + "T12:00:00",
  );
  vencimiento.setHours(0, 0, 0, 0);
 
  const diferencia = Math.ceil(
    (vencimiento.getTime() - hoy.getTime()) /
      (1000 * 60 * 60 * 24),
  );
 
  if (diferencia < 0) {
    return `${Math.abs(diferencia)} días vencido`;
  }
 
  if (diferencia === 0) {
    return "Vence hoy";
  }
 
  return `${diferencia} días restantes`;
}

