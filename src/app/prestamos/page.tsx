"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../lib/supabase";

type Cliente = {
  id: string;
  first_name: string;
  last_name: string;
};

type Moneda = {
  id: string;
  code: string;
  symbol: string;
};

type TipoPrestamo = "personal" | "card" | "collateral";
type FrecuenciaInteres = "weekly" | "biweekly" | "monthly";

type EstadoPrestamo =
  | "draft"
  | "approved"
  | "active"
  | "overdue"
  | "paid"
  | "cancelled";

type Prestamo = {
  id: string;
  organization_id: string;
  client_id: string;
  currency_id: string;
  loan_number: string;
  loan_type: TipoPrestamo;
  principal_amount: number;
  interest_rate: number;
  interest_frequency: FrecuenciaInteres;
  term_count: number;
  start_date: string;
  due_date: string | null;
  principal_balance: number;
  interest_balance: number;
  late_fee_balance: number;
  status: EstadoPrestamo;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
  currencies: {
    code: string;
    symbol: string;
  } | null;
};

type FormularioPrestamo = {
  client_id: string;
  currency_id: string;
  loan_type: TipoPrestamo;
  principal_amount: string;
  interest_rate: string;
  interest_frequency: FrecuenciaInteres;
  term_count: string;
  start_date: string;
  notes: string;
};

type FormularioTarjeta = {
  bank_name: string;
  card_last_four: string;
  cardholder_name: string;
  employer_name: string;
  work_sector: string;
  work_location: string;
  job_position: string;
  estimated_salary: string;
  collection_frequency: FrecuenciaInteres;
  collection_weekday: string;
  collection_day_1: string;
  collection_day_2: string;
  next_collection_date: string;
  notes: string;
};

type FormularioGarantia = {
  collateral_type: string;
  description: string;
  brand: string;
  model: string;
  manufacture_year: string;
  serial_number: string;
  registration_number: string;
  plate_number: string;
  chassis_number: string;
  title_number: string;
  estimated_value: string;
  accepted_value: string;
  physical_condition: string;
  storage_location: string;
  received_date: string;
  notes: string;
};

type FiltroEstado = EstadoPrestamo | "all";
type FiltroFrecuencia = FrecuenciaInteres | "all";

function obtenerFechaActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

const formularioInicial: FormularioPrestamo = {
  client_id: "",
  currency_id: "",
  loan_type: "personal",
  principal_amount: "",
  interest_rate: "",
  interest_frequency: "monthly",
  term_count: "1",
  start_date: obtenerFechaActual(),
  notes: "",
};

const formularioTarjetaInicial: FormularioTarjeta = {
  bank_name: "",
  card_last_four: "",
  cardholder_name: "",
  employer_name: "",
  work_sector: "",
  work_location: "",
  job_position: "",
  estimated_salary: "",
  collection_frequency: "monthly",
  collection_weekday: "",
  collection_day_1: "",
  collection_day_2: "",
  next_collection_date: "",
  notes: "",
};

const formularioGarantiaInicial: FormularioGarantia = {
  collateral_type: "vehicle",
  description: "",
  brand: "",
  model: "",
  manufacture_year: "",
  serial_number: "",
  registration_number: "",
  plate_number: "",
  chassis_number: "",
  title_number: "",
  estimated_value: "",
  accepted_value: "",
  physical_condition: "",
  storage_location: "",
  received_date: obtenerFechaActual(),
  notes: "",
};

export default function PrestamosPage() {
  const supabase = useMemo(function crearClienteSupabase() {
    return createClient();
  }, []);

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("all");
  const [filtroFrecuencia, setFiltroFrecuencia] =
    useState<FiltroFrecuencia>("all");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [formulario, setFormulario] =
    useState<FormularioPrestamo>(formularioInicial);
  const [formularioTarjeta, setFormularioTarjeta] =
    useState<FormularioTarjeta>(formularioTarjetaInicial);
  const [formularioGarantia, setFormularioGarantia] =
    useState<FormularioGarantia>(formularioGarantiaInicial);

  const cargarDatos = useCallback(
    async function cargarDatosDesdeSupabase() {
      setCargando(true);
      setMensajeError("");

      const [
        resultadoClientes,
        resultadoMonedas,
        resultadoPrestamos,
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("id, first_name, last_name")
          .eq("status", "active")
          .order("first_name", { ascending: true }),
        supabase
          .from("currencies")
          .select("id, code, symbol")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("loans")
          .select(
            "id, organization_id, client_id, currency_id, loan_number, loan_type, principal_amount, interest_rate, interest_frequency, term_count, start_date, due_date, principal_balance, interest_balance, late_fee_balance, status, clients(first_name, last_name), currencies(code, symbol)",
          )
          .order("created_at", { ascending: false }),
      ]);

      if (resultadoClientes.error) {
        setMensajeError(
          "No se pudieron cargar los clientes: " +
            resultadoClientes.error.message,
        );
        setClientes([]);
      } else {
        setClientes(
          (resultadoClientes.data || []) as Cliente[],
        );
      }

      if (resultadoMonedas.error) {
        setMensajeError(
          "No se pudieron cargar las monedas: " +
            resultadoMonedas.error.message,
        );
        setMonedas([]);
      } else {
        setMonedas(
          (resultadoMonedas.data || []) as Moneda[],
        );
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

      setCargando(false);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrirLaPagina() {
      void cargarDatos();
    },
    [cargarDatos],
  );

  function calcularFechaVencimiento(
    fechaInicio: string,
    frecuencia: FrecuenciaInteres,
    cantidadPeriodos: number,
  ) {
    const fecha = new Date(fechaInicio + "T12:00:00");

    if (frecuencia === "weekly") {
      fecha.setDate(fecha.getDate() + cantidadPeriodos * 7);
    }

    if (frecuencia === "biweekly") {
      fecha.setDate(fecha.getDate() + cantidadPeriodos * 15);
    }

    if (frecuencia === "monthly") {
      fecha.setMonth(fecha.getMonth() + cantidadPeriodos);
    }

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }

  function generarCuotasPrestamo({
    organizationId,
    loanId,
    capital,
    tasa,
    cantidadPeriodos,
    fechaInicio,
    frecuencia,
  }: {
    organizationId: string;
    loanId: string;
    capital: number;
    tasa: number;
    cantidadPeriodos: number;
    fechaInicio: string;
    frecuencia: FrecuenciaInteres;
  }) {
    const capitalBase =
      Math.floor((capital / cantidadPeriodos) * 100) / 100;
    const interesPorPeriodo =
      Math.round(capital * (tasa / 100) * 100) / 100;

    return Array.from(
      { length: cantidadPeriodos },
      function crearCuota(_, indice) {
        const numero = indice + 1;
        const capitalAsignado =
          numero === cantidadPeriodos
            ? Math.round(
                (capital -
                  capitalBase * (cantidadPeriodos - 1)) *
                  100,
              ) / 100
            : capitalBase;

        return {
          organization_id: organizationId,
          loan_id: loanId,
          installment_number: numero,
          due_date: calcularFechaVencimiento(
            fechaInicio,
            frecuencia,
            numero,
          ),
          principal_due: capitalAsignado,
          interest_due: interesPorPeriodo,
          late_fee_due: 0,
          principal_paid: 0,
          interest_paid: 0,
          late_fee_paid: 0,
          status: "pending",
        };
      },
    );
  }

  function generarNumeroPrestamo() {
    const fecha = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const aleatorio = Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase();

    return `PRE-${fecha}-${aleatorio}`;
  }

  async function obtenerOrganizationId() {
    const prestamoExistente = prestamos.find(
      (prestamo) => Boolean(prestamo.organization_id),
    );

    if (prestamoExistente?.organization_id) {
      return prestamoExistente.organization_id;
    }

    const resultado = await supabase
      .from("cash_movements")
      .select("organization_id")
      .not("organization_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (resultado.error) {
      return "";
    }

    return resultado.data?.organization_id || "";
  }

  async function guardarPrestamo(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setGuardando(true);
    setMensajeError("");
    setMensajeExito("");

    const capital = Number(formulario.principal_amount);
    const tasa = Number(formulario.interest_rate);
    const cantidadPeriodos = Number(formulario.term_count);

    if (formulario.client_id === "") {
      setMensajeError("Debes seleccionar un cliente.");
      setGuardando(false);
      return;
    }

    if (formulario.currency_id === "") {
      setMensajeError("Debes seleccionar una moneda.");
      setGuardando(false);
      return;
    }

    if (!Number.isFinite(capital) || capital <= 0) {
      setMensajeError(
        "El monto del préstamo debe ser mayor que cero.",
      );
      setGuardando(false);
      return;
    }

    if (!Number.isFinite(tasa) || tasa < 0) {
      setMensajeError(
        "La tasa de interés no puede ser negativa.",
      );
      setGuardando(false);
      return;
    }

    if (
      !Number.isInteger(cantidadPeriodos) ||
      cantidadPeriodos <= 0
    ) {
      setMensajeError(
        "La cantidad de períodos debe ser un número entero mayor que cero.",
      );
      setGuardando(false);
      return;
    }

    if (formulario.loan_type === "card") {
      if (formularioTarjeta.bank_name.trim() === "") {
        setMensajeError("Debes indicar el banco de la tarjeta.");
        setGuardando(false);
        return;
      }

      if (!/^\d{4}$/.test(formularioTarjeta.card_last_four.trim())) {
        setMensajeError("Los últimos 4 dígitos deben contener exactamente cuatro números.");
        setGuardando(false);
        return;
      }

      if (formularioTarjeta.cardholder_name.trim() === "") {
        setMensajeError("Debes indicar el titular de la tarjeta.");
        setGuardando(false);
        return;
      }

      if (
        formularioTarjeta.collection_frequency === "weekly" &&
        formularioTarjeta.collection_weekday === ""
      ) {
        setMensajeError("Selecciona el día semanal de cobro.");
        setGuardando(false);
        return;
      }

      if (
        formularioTarjeta.collection_frequency !== "weekly" &&
        formularioTarjeta.collection_day_1 === ""
      ) {
        setMensajeError("Indica por lo menos un día de cobro.");
        setGuardando(false);
        return;
      }
    }

    if (formulario.loan_type === "collateral") {
      if (formularioGarantia.description.trim() === "") {
        setMensajeError("Debes describir la garantía.");
        setGuardando(false);
        return;
      }

      if (formularioGarantia.storage_location.trim() === "") {
        setMensajeError("Debes indicar dónde se guardará la garantía.");
        setGuardando(false);
        return;
      }
    }

    const organizationId = await obtenerOrganizationId();

    if (!organizationId) {
      setMensajeError(
        "No se pudo determinar la organización. Debe existir al menos un préstamo o movimiento de caja anterior.",
      );
      setGuardando(false);
      return;
    }

    const interesPorPeriodo = capital * (tasa / 100);
    const interesTotal =
      interesPorPeriodo * cantidadPeriodos;
    const fechaVencimiento = calcularFechaVencimiento(
      formulario.start_date,
      formulario.interest_frequency,
      cantidadPeriodos,
    );
    const numeroPrestamo = generarNumeroPrestamo();

    const nuevoPrestamo = {
      organization_id: organizationId,
      client_id: formulario.client_id,
      currency_id: formulario.currency_id,
      loan_number: numeroPrestamo,
      loan_type: formulario.loan_type,
      principal_amount: capital,
      interest_rate: tasa,
      interest_frequency:
        formulario.interest_frequency,
      term_count: cantidadPeriodos,
      start_date: formulario.start_date,
      due_date: fechaVencimiento,
      principal_balance: capital,
      interest_balance: interesTotal,
      late_fee_balance: 0,
      status: "active",
      notes: formulario.notes.trim() || null,
    };

    const resultadoPrestamo = await supabase
      .from("loans")
      .insert(nuevoPrestamo)
      .select("id")
      .single();

    if (resultadoPrestamo.error) {
      setMensajeError(
        "No se pudo guardar el préstamo: " +
          resultadoPrestamo.error.message,
      );
      setGuardando(false);
      return;
    }

    const resultadoCaja = await supabase
      .from("cash_movements")
      .insert({
        organization_id: organizationId,
        currency_id: formulario.currency_id,
        movement_date: new Date().toISOString(),
        movement_type: "loan_disbursement",
        direction: "expense",
        amount: capital,
        source_type: "loan",
        source_id: resultadoPrestamo.data.id,
        reference_number: numeroPrestamo,
        description:
          "Desembolso del préstamo " + numeroPrestamo,
        payment_method: "cash",
        status: "posted",
      })
      .select("id")
      .single();

    if (resultadoCaja.error) {
      await supabase
        .from("loans")
        .delete()
        .eq("id", resultadoPrestamo.data.id);

      setMensajeError(
        "No se pudo registrar el desembolso en Caja. El préstamo fue revertido para evitar inconsistencias: " +
          resultadoCaja.error.message,
      );
      setGuardando(false);
      return;
    }

    const cuotas = generarCuotasPrestamo({
      organizationId,
      loanId: resultadoPrestamo.data.id,
      capital,
      tasa,
      cantidadPeriodos,
      fechaInicio: formulario.start_date,
      frecuencia: formulario.interest_frequency,
    });

    const resultadoCuotas = await supabase
      .from("loan_installments")
      .insert(cuotas);

    if (resultadoCuotas.error) {
      await supabase
        .from("cash_movements")
        .delete()
        .eq("id", resultadoCaja.data.id);

      await supabase
        .from("loans")
        .delete()
        .eq("id", resultadoPrestamo.data.id);

      setMensajeError(
        "No se pudieron crear las cuotas. El desembolso y el préstamo fueron revertidos para evitar inconsistencias: " +
          resultadoCuotas.error.message,
      );
      setGuardando(false);
      return;
    }

    if (formulario.loan_type === "card") {
      const resultadoTarjeta = await supabase
        .from("loan_card_details")
        .insert({
          organization_id: organizationId,
          loan_id: resultadoPrestamo.data.id,
          client_id: formulario.client_id,
          bank_name: formularioTarjeta.bank_name.trim(),
          card_last_four: formularioTarjeta.card_last_four.trim(),
          cardholder_name: formularioTarjeta.cardholder_name.trim(),
          employer_name: formularioTarjeta.employer_name.trim() || null,
          work_sector: formularioTarjeta.work_sector.trim() || null,
          work_location: formularioTarjeta.work_location.trim() || null,
          job_position: formularioTarjeta.job_position.trim() || null,
          estimated_salary:
            formularioTarjeta.estimated_salary === ""
              ? null
              : Number(formularioTarjeta.estimated_salary),
          collection_frequency: formularioTarjeta.collection_frequency,
          collection_weekday:
            formularioTarjeta.collection_frequency === "weekly"
              ? formularioTarjeta.collection_weekday || null
              : null,
          collection_day_1:
            formularioTarjeta.collection_frequency === "weekly" ||
            formularioTarjeta.collection_day_1 === ""
              ? null
              : Number(formularioTarjeta.collection_day_1),
          collection_day_2:
            formularioTarjeta.collection_frequency !== "biweekly" ||
            formularioTarjeta.collection_day_2 === ""
              ? null
              : Number(formularioTarjeta.collection_day_2),
          next_collection_date:
            formularioTarjeta.next_collection_date || null,
          card_status: "in_custody",
          notes: formularioTarjeta.notes.trim() || null,
        });

      if (resultadoTarjeta.error) {
        await supabase
          .from("cash_movements")
          .delete()
          .eq("id", resultadoCaja.data.id);

        await supabase
          .from("loans")
          .delete()
          .eq("id", resultadoPrestamo.data.id);

        setMensajeError(
          "No se pudo guardar la información de la tarjeta. El préstamo, las cuotas y el desembolso fueron revertidos: " +
            resultadoTarjeta.error.message,
        );
        setGuardando(false);
        return;
      }
    }

    if (formulario.loan_type === "collateral") {
      const resultadoGarantia = await supabase
        .from("loan_collaterals")
        .insert({
          organization_id: organizationId,
          loan_id: resultadoPrestamo.data.id,
          client_id: formulario.client_id,
          collateral_type: formularioGarantia.collateral_type,
          description: formularioGarantia.description.trim(),
          brand: formularioGarantia.brand.trim() || null,
          model: formularioGarantia.model.trim() || null,
          manufacture_year:
            formularioGarantia.manufacture_year === ""
              ? null
              : Number(formularioGarantia.manufacture_year),
          serial_number: formularioGarantia.serial_number.trim() || null,
          registration_number:
            formularioGarantia.registration_number.trim() || null,
          plate_number: formularioGarantia.plate_number.trim() || null,
          chassis_number: formularioGarantia.chassis_number.trim() || null,
          title_number: formularioGarantia.title_number.trim() || null,
          estimated_value:
            formularioGarantia.estimated_value === ""
              ? null
              : Number(formularioGarantia.estimated_value),
          accepted_value:
            formularioGarantia.accepted_value === ""
              ? null
              : Number(formularioGarantia.accepted_value),
          physical_condition:
            formularioGarantia.physical_condition.trim() || null,
          storage_location: formularioGarantia.storage_location.trim(),
          received_date: formularioGarantia.received_date,
          collateral_status: "received",
          notes: formularioGarantia.notes.trim() || null,
        });

      if (resultadoGarantia.error) {
        await supabase
          .from("cash_movements")
          .delete()
          .eq("id", resultadoCaja.data.id);

        await supabase
          .from("loans")
          .delete()
          .eq("id", resultadoPrestamo.data.id);

        setMensajeError(
          "No se pudo guardar la garantía. El préstamo, las cuotas y el desembolso fueron revertidos: " +
            resultadoGarantia.error.message,
        );
        setGuardando(false);
        return;
      }
    }

    setFormulario({
      ...formularioInicial,
      currency_id:
        monedas.length > 0 ? monedas[0].id : "",
    });
    setFormularioTarjeta(formularioTarjetaInicial);
    setFormularioGarantia(formularioGarantiaInicial);
    setModalAbierto(false);
    await cargarDatos();
    setMensajeExito(
      `Préstamo ${numeroPrestamo} creado con ${cantidadPeriodos} cuotas y desembolso registrado en Caja.`,
    );
    setGuardando(false);
  }

  const prestamosFiltrados = useMemo(
    function filtrarPrestamos() {
      const termino = busqueda.trim().toLowerCase();

      return prestamos.filter(function coincide(prestamo) {
        const nombreCliente = prestamo.clients
          ? (
              prestamo.clients.first_name +
              " " +
              prestamo.clients.last_name
            ).toLowerCase()
          : "";

        const coincideBusqueda =
          termino === "" ||
          prestamo.loan_number
            .toLowerCase()
            .includes(termino) ||
          nombreCliente.includes(termino) ||
          obtenerTextoTipo(prestamo.loan_type)
            .toLowerCase()
            .includes(termino) ||
          obtenerTextoEstado(prestamo.status)
            .toLowerCase()
            .includes(termino);

        const coincideEstado =
          filtroEstado === "all" ||
          prestamo.status === filtroEstado;

        const coincideFrecuencia =
          filtroFrecuencia === "all" ||
          prestamo.interest_frequency === filtroFrecuencia;

        return (
          coincideBusqueda &&
          coincideEstado &&
          coincideFrecuencia
        );
      });
    },
    [
      busqueda,
      filtroEstado,
      filtroFrecuencia,
      prestamos,
    ],
  );

  const resumen = useMemo(
    function calcularResumen() {
      const activos = prestamos.filter(
        (prestamo) => prestamo.status === "active",
      );
      const vencidos = prestamos.filter(
        (prestamo) => prestamo.status === "overdue",
      );
      const pagados = prestamos.filter(
        (prestamo) => prestamo.status === "paid",
      );

      return {
        activos: activos.length,
        vencidos: vencidos.length,
        pagados: pagados.length,
        capitalColocado: prestamos.reduce(
          (total, prestamo) =>
            total + Number(prestamo.principal_amount),
          0,
        ),
        capitalPendiente: prestamos.reduce(
          (total, prestamo) =>
            total + Number(prestamo.principal_balance),
          0,
        ),
        interesPendiente: prestamos.reduce(
          (total, prestamo) =>
            total + Number(prestamo.interest_balance),
          0,
        ),
        moraPendiente: prestamos.reduce(
          (total, prestamo) =>
            total + Number(prestamo.late_fee_balance),
          0,
        ),
      };
    },
    [prestamos],
  );

  function obtenerTextoTipo(tipo: TipoPrestamo) {
    if (tipo === "personal") return "Personal";
    if (tipo === "card") return "Con tarjeta";
    return "Con garantía";
  }

  function obtenerTextoFrecuencia(
    frecuencia: FrecuenciaInteres,
  ) {
    if (frecuencia === "weekly") return "Semanal";
    if (frecuencia === "biweekly") return "Quincenal";
    return "Mensual";
  }

  function obtenerTextoEstado(estado: EstadoPrestamo) {
    if (estado === "draft") return "Borrador";
    if (estado === "approved") return "Aprobado";
    if (estado === "active") return "Activo";
    if (estado === "overdue") return "Vencido";
    if (estado === "paid") return "Pagado";
    return "Cancelado";
  }

  function obtenerClaseEstado(estado: EstadoPrestamo) {
    const claseBase =
      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ";

    if (estado === "active") {
      return claseBase + "bg-green-100 text-green-800";
    }

    if (estado === "paid") {
      return claseBase + "bg-blue-100 text-blue-800";
    }

    if (estado === "overdue") {
      return claseBase + "bg-red-100 text-red-800";
    }

    if (estado === "cancelled") {
      return claseBase + "bg-gray-200 text-gray-700";
    }

    return claseBase + "bg-yellow-100 text-yellow-800";
  }

  function formatearMonto(
    monto: number,
    moneda: Prestamo["currencies"],
  ) {
    const simbolo = moneda ? moneda.symbol : "RD$";

    return (
      simbolo +
      " " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatearMontoResumen(monto: number) {
    return (
      "RD$ " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function abrirModal() {
    setMensajeError("");
    setMensajeExito("");
    setFormulario({
      ...formularioInicial,
      currency_id:
        monedas.length > 0 ? monedas[0].id : "",
    });
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (!guardando) {
      setModalAbierto(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">
              Préstamos
            </h1>
            <p className="mt-2 text-gray-600">
              Administra la cartera, balances y desembolsos
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="rounded-lg bg-blue-900 px-5 py-3 font-medium text-white transition hover:bg-blue-800"
          >
            + Nuevo préstamo
          </button>
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

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TarjetaResumen
            titulo="Préstamos activos"
            valor={String(resumen.activos)}
            detalle="Actualmente vigentes"
          />
          <TarjetaResumen
            titulo="Préstamos vencidos"
            valor={String(resumen.vencidos)}
            detalle="Requieren seguimiento"
          />
          <TarjetaResumen
            titulo="Capital colocado"
            valor={formatearMontoResumen(
              resumen.capitalColocado,
            )}
            detalle="Capital original total"
          />
          <TarjetaResumen
            titulo="Capital pendiente"
            valor={formatearMontoResumen(
              resumen.capitalPendiente,
            )}
            detalle={`${resumen.pagados} préstamos pagados`}
          />
          <TarjetaResumen
            titulo="Interés pendiente"
            valor={formatearMontoResumen(
              resumen.interesPendiente,
            )}
            detalle="Interés aún por cobrar"
          />
          <TarjetaResumen
            titulo="Mora pendiente"
            valor={formatearMontoResumen(
              resumen.moraPendiente,
            )}
            detalle="Mora acumulada"
          />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Cartera de préstamos
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Busca por número, cliente, tipo o estado.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                id="buscar-prestamo"
                type="search"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Buscar préstamo..."
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
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
                <option value="active">Activos</option>
                <option value="overdue">Vencidos</option>
                <option value="paid">Pagados</option>
                <option value="approved">Aprobados</option>
                <option value="draft">Borradores</option>
                <option value="cancelled">Cancelados</option>
              </select>

              <select
                value={filtroFrecuencia}
                onChange={(event) =>
                  setFiltroFrecuencia(
                    event.target.value as FiltroFrecuencia,
                  )
                }
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              >
                <option value="all">
                  Todas las frecuencias
                </option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Número",
                    "Cliente",
                    "Tipo",
                    "Capital",
                    "Capital pendiente",
                    "Interés",
                    "Frecuencia",
                    "Vencimiento",
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
                {cargando ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Cargando préstamos...
                    </td>
                  </tr>
                ) : prestamosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No se encontraron préstamos.
                    </td>
                  </tr>
                ) : (
                  prestamosFiltrados.map((prestamo) => (
                    <tr
                      key={prestamo.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href =
                              "/prestamos/" + prestamo.id;
                          }}
                          className="text-blue-900 hover:underline"
                        >
                          {prestamo.loan_number}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                        {prestamo.clients
                          ? `${prestamo.clients.first_name} ${prestamo.clients.last_name}`
                          : "Sin cliente"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {obtenerTextoTipo(prestamo.loan_type)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearMonto(
                          prestamo.principal_amount,
                          prestamo.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-blue-900">
                        {formatearMonto(
                          prestamo.principal_balance,
                          prestamo.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {prestamo.interest_rate}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {obtenerTextoFrecuencia(
                          prestamo.interest_frequency,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {prestamo.due_date
                          ? new Date(
                              prestamo.due_date +
                                "T12:00:00",
                            ).toLocaleDateString("es-DO")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span
                          className={obtenerClaseEstado(
                            prestamo.status,
                          )}
                        >
                          {obtenerTextoEstado(
                            prestamo.status,
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Nuevo préstamo
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  El desembolso se registrará automáticamente en Caja.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="text-2xl text-gray-500 hover:text-gray-900"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={guardarPrestamo}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label
                  htmlFor="client_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cliente
                </label>
                <select
                  id="client_id"
                  value={formulario.client_id}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      client_id: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  required
                >
                  <option value="">
                    Selecciona un cliente
                  </option>
                  {clientes.map((cliente) => (
                    <option
                      key={cliente.id}
                      value={cliente.id}
                    >
                      {cliente.first_name}{" "}
                      {cliente.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="currency_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Moneda
                </label>
                <select
                  id="currency_id"
                  value={formulario.currency_id}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      currency_id: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  required
                >
                  <option value="">
                    Selecciona una moneda
                  </option>
                  {monedas.map((moneda) => (
                    <option
                      key={moneda.id}
                      value={moneda.id}
                    >
                      {moneda.code} - {moneda.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="loan_type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tipo de préstamo
                </label>
                <select
                  id="loan_type"
                  value={formulario.loan_type}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      loan_type:
                        event.target.value as TipoPrestamo,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                >
                  <option value="personal">Personal</option>
                  <option value="card">Con tarjeta</option>
                  <option value="collateral">
                    Con garantía
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="principal_amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Capital prestado
                </label>
                <input
                  id="principal_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formulario.principal_amount}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      principal_amount: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="interest_rate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tasa por período (%)
                </label>
                <input
                  id="interest_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.interest_rate}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      interest_rate: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="interest_frequency"
                  className="block text-sm font-medium text-gray-700"
                >
                  Frecuencia
                </label>
                <select
                  id="interest_frequency"
                  value={formulario.interest_frequency}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      interest_frequency:
                        event.target
                          .value as FrecuenciaInteres,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">
                    Quincenal
                  </option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="term_count"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cantidad de períodos
                </label>
                <input
                  id="term_count"
                  type="number"
                  min="1"
                  step="1"
                  value={formulario.term_count}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      term_count: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="start_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Fecha de inicio
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={formulario.start_date}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      start_date: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              {formulario.loan_type === "card" && (
                <div className="sm:col-span-2 grid grid-cols-1 gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <h3 className="text-lg font-bold text-blue-900">
                      Información de la tarjeta
                    </h3>
                    <p className="mt-1 text-sm text-blue-800">
                      Guarda solamente los últimos cuatro dígitos. No registres PIN, CVV ni el número completo.
                    </p>
                  </div>

                  <CampoTexto
                    id="bank_name"
                    etiqueta="Banco"
                    valor={formularioTarjeta.bank_name}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        bank_name: valor,
                      })
                    }
                    requerido
                  />

                  <CampoTexto
                    id="card_last_four"
                    etiqueta="Últimos 4 dígitos"
                    valor={formularioTarjeta.card_last_four}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        card_last_four: valor.replace(/\D/g, "").slice(0, 4),
                      })
                    }
                    requerido
                  />

                  <CampoTexto
                    id="cardholder_name"
                    etiqueta="Titular de la tarjeta"
                    valor={formularioTarjeta.cardholder_name}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        cardholder_name: valor,
                      })
                    }
                    requerido
                  />

                  <CampoTexto
                    id="employer_name"
                    etiqueta="Empresa o lugar de trabajo"
                    valor={formularioTarjeta.employer_name}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        employer_name: valor,
                      })
                    }
                  />

                  <CampoTexto
                    id="work_sector"
                    etiqueta="Sector donde trabaja"
                    valor={formularioTarjeta.work_sector}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        work_sector: valor,
                      })
                    }
                  />

                  <CampoTexto
                    id="work_location"
                    etiqueta="Ubicación laboral"
                    valor={formularioTarjeta.work_location}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        work_location: valor,
                      })
                    }
                  />

                  <CampoTexto
                    id="job_position"
                    etiqueta="Cargo"
                    valor={formularioTarjeta.job_position}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        job_position: valor,
                      })
                    }
                  />

                  <CampoTexto
                    id="estimated_salary"
                    etiqueta="Salario estimado"
                    tipo="number"
                    valor={formularioTarjeta.estimated_salary}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        estimated_salary: valor,
                      })
                    }
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Frecuencia de cobro
                    </label>
                    <select
                      value={formularioTarjeta.collection_frequency}
                      onChange={(event) =>
                        setFormularioTarjeta({
                          ...formularioTarjeta,
                          collection_frequency:
                            event.target.value as FrecuenciaInteres,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  {formularioTarjeta.collection_frequency === "weekly" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Día semanal de cobro
                      </label>
                      <select
                        value={formularioTarjeta.collection_weekday}
                        onChange={(event) =>
                          setFormularioTarjeta({
                            ...formularioTarjeta,
                            collection_weekday: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3"
                      >
                        <option value="">Seleccionar</option>
                        <option value="monday">Lunes</option>
                        <option value="tuesday">Martes</option>
                        <option value="wednesday">Miércoles</option>
                        <option value="thursday">Jueves</option>
                        <option value="friday">Viernes</option>
                        <option value="saturday">Sábado</option>
                        <option value="sunday">Domingo</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <CampoTexto
                        id="collection_day_1"
                        etiqueta="Primer día de cobro"
                        tipo="number"
                        valor={formularioTarjeta.collection_day_1}
                        cambiar={(valor) =>
                          setFormularioTarjeta({
                            ...formularioTarjeta,
                            collection_day_1: valor,
                          })
                        }
                      />
                      {formularioTarjeta.collection_frequency === "biweekly" && (
                        <CampoTexto
                          id="collection_day_2"
                          etiqueta="Segundo día de cobro"
                          tipo="number"
                          valor={formularioTarjeta.collection_day_2}
                          cambiar={(valor) =>
                            setFormularioTarjeta({
                              ...formularioTarjeta,
                              collection_day_2: valor,
                            })
                          }
                        />
                      )}
                    </>
                  )}

                  <CampoTexto
                    id="next_collection_date"
                    etiqueta="Próxima fecha de cobro"
                    tipo="date"
                    valor={formularioTarjeta.next_collection_date}
                    cambiar={(valor) =>
                      setFormularioTarjeta({
                        ...formularioTarjeta,
                        next_collection_date: valor,
                      })
                    }
                  />
                </div>
              )}

              {formulario.loan_type === "collateral" && (
                <div className="sm:col-span-2 grid grid-cols-1 gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <h3 className="text-lg font-bold text-amber-900">
                      Información de la garantía
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo de garantía
                    </label>
                    <select
                      value={formularioGarantia.collateral_type}
                      onChange={(event) =>
                        setFormularioGarantia({
                          ...formularioGarantia,
                          collateral_type: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3"
                    >
                      <option value="vehicle">Vehículo</option>
                      <option value="jewelry">Prenda o joya</option>
                      <option value="article">Artículo</option>
                      <option value="appliance">Electrodoméstico</option>
                      <option value="property_title">Título de propiedad</option>
                      <option value="land">Terreno o solar</option>
                      <option value="house">Vivienda</option>
                      <option value="registration">Matrícula</option>
                      <option value="legal_document">Documento legal</option>
                      <option value="other">Otra</option>
                    </select>
                  </div>

                  <CampoTexto
                    id="collateral_description"
                    etiqueta="Descripción"
                    valor={formularioGarantia.description}
                    cambiar={(valor) =>
                      setFormularioGarantia({
                        ...formularioGarantia,
                        description: valor,
                      })
                    }
                    requerido
                  />

                  <CampoTexto id="brand" etiqueta="Marca" valor={formularioGarantia.brand} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, brand: valor })} />
                  <CampoTexto id="model" etiqueta="Modelo" valor={formularioGarantia.model} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, model: valor })} />
                  <CampoTexto id="manufacture_year" etiqueta="Año" tipo="number" valor={formularioGarantia.manufacture_year} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, manufacture_year: valor })} />
                  <CampoTexto id="serial_number" etiqueta="Número de serie" valor={formularioGarantia.serial_number} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, serial_number: valor })} />
                  <CampoTexto id="registration_number" etiqueta="Matrícula o registro" valor={formularioGarantia.registration_number} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, registration_number: valor })} />
                  <CampoTexto id="plate_number" etiqueta="Placa" valor={formularioGarantia.plate_number} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, plate_number: valor })} />
                  <CampoTexto id="chassis_number" etiqueta="Chasis" valor={formularioGarantia.chassis_number} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, chassis_number: valor })} />
                  <CampoTexto id="title_number" etiqueta="Número de título" valor={formularioGarantia.title_number} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, title_number: valor })} />
                  <CampoTexto id="estimated_value" etiqueta="Valor estimado" tipo="number" valor={formularioGarantia.estimated_value} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, estimated_value: valor })} />
                  <CampoTexto id="accepted_value" etiqueta="Valor aceptado" tipo="number" valor={formularioGarantia.accepted_value} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, accepted_value: valor })} />
                  <CampoTexto id="physical_condition" etiqueta="Condición física" valor={formularioGarantia.physical_condition} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, physical_condition: valor })} />
                  <CampoTexto id="storage_location" etiqueta="Lugar de resguardo" valor={formularioGarantia.storage_location} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, storage_location: valor })} requerido />
                  <CampoTexto id="received_date" etiqueta="Fecha de recepción" tipo="date" valor={formularioGarantia.received_date} cambiar={(valor) => setFormularioGarantia({ ...formularioGarantia, received_date: valor })} />
                </div>
              )}

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
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      notes: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  placeholder="Opcional"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="rounded-lg px-5 py-3 font-medium text-gray-600 hover:bg-gray-100"
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : "Crear préstamo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function CampoTexto({
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
        min={tipo === "number" ? "0" : undefined}
        max={
          id === "collection_day_1" ||
          id === "collection_day_2"
            ? "31"
            : undefined
        }
        step={
          id === "collection_day_1" ||
          id === "collection_day_2" ||
          id === "manufacture_year"
            ? "1"
            : tipo === "number"
              ? "0.01"
              : undefined
        }
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
      />
    </div>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-600">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold text-blue-900">
        {valor}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {detalle}
      </p>
    </div>
  );
}

