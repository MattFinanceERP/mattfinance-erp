"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "../components/PermissionGuard";
import { useAccess } from "../components/AccessProvider";
import { createClient } from "../lib/supabase";

type Moneda = { code: string; symbol: string };
type Cliente = {
  first_name: string;
  last_name: string;
  phone_primary: string | null;
  document_number: string | null;
};
type Prestamo = {
  loan_number: string;
  principal_balance: number;
  interest_balance: number;
  late_fee_balance: number;
  status: string;
  interest_frequency: string;
  currencies: Moneda | null;
};
type Garantia = {
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
  notes: string | null;
  clients: Cliente | null;
  loans: Prestamo | null;
};


type DashboardGarantias = {
  total_collaterals: number;
  active_collaterals: number;
  released_collaterals: number;
  returned_collaterals: number;
  executed_collaterals: number;
  sold_collaterals: number;
  overdue_loans_with_collateral: number;
  released_pending_return: number;
  executed_pending_sale: number;
  total_estimated_value: number;
  total_accepted_value: number;
  active_loan_debt: number;
  executed_loan_debt: number;
  total_gross_sales: number;
  total_sale_expenses: number;
  total_net_sales: number;
  total_applied_to_loans: number;
  total_sale_remaining: number;
};

type AlertaGarantia = {
  collateral_id: string;
  alert_type: string;
  alert_priority: "high" | "medium" | "low";
  client_name: string;
  loan_number: string;
  collateral_type: string;
  collateral_description: string;
  collateral_status: string;
  loan_status: string;
  total_loan_balance: number;
  received_date: string;
  released_at: string | null;
  executed_at: string | null;
  days_in_status: number;
  alert_message: string;
};
type Evento = {
  id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  previous_location: string | null;
  new_location: string | null;
  previous_condition: string | null;
  new_condition: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

type ArchivoGarantia = {
  id: string;
  file_category: "photo" | "document";
  document_type: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  description: string | null;
  uploaded_at: string;
  signed_url: string;
};

export default function GarantiasPage() {
  return (
    <PermissionGuard permission="collaterals.view">
      <GarantiasContent />
    </PermissionGuard>
  );
}

function GarantiasContent() {
  const supabase = useMemo(() => createClient(), []);
  const { tienePermiso } = useAccess();

  const puedeGestionar =
    tienePermiso("collaterals.manage");
  const puedeEjecutar =
    tienePermiso("collaterals.execute");
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [dashboard, setDashboard] =
    useState<DashboardGarantias | null>(null);
  const [alertas, setAlertas] = useState<AlertaGarantia[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [seleccionada, setSeleccionada] = useState<Garantia | null>(null);
  const [pestanaActiva, setPestanaActiva] = useState<
    "informacion" | "fotografias" | "documentos" | "historial"
  >("informacion");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [ubicacion, setUbicacion] = useState("all");
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [accion, setAccion] = useState<
    "ubicacion" | "condicion" | "devolver" | "ejecutar" | null
  >(null);
  const [nuevoValor, setNuevoValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [notasAccion, setNotasAccion] = useState("");
  const [tipoReceptor, setTipoReceptor] = useState<
    "holder" | "authorized_person"
  >("holder");
  const [recibidoPor, setRecibidoPor] = useState("");
  const [documentoReceptor, setDocumentoReceptor] = useState("");
  const [telefonoReceptor, setTelefonoReceptor] = useState("");
  const [relacionReceptor, setRelacionReceptor] = useState("");
  const [condicionEntrega, setCondicionEntrega] = useState("");
  const [entregaConfirmada, setEntregaConfirmada] = useState(false);
  const [guardandoAccion, setGuardandoAccion] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoGarantia[]>([]);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] =
    useState<File | null>(null);
  const [tipoArchivo, setTipoArchivo] = useState("other");
  const [descripcionArchivo, setDescripcionArchivo] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    const [garantiasResultado, dashboardResultado, alertasResultado] =
      await Promise.all([
        supabase
          .from("loan_collaterals")
          .select(
            "id, collateral_type, description, brand, model, manufacture_year, serial_number, registration_number, plate_number, chassis_number, title_number, estimated_value, accepted_value, physical_condition, storage_location, received_date, collateral_status, notes, clients(first_name, last_name, phone_primary, document_number), loans(loan_number, principal_balance, interest_balance, late_fee_balance, status, interest_frequency, currencies(code, symbol))",
          )
          .order("received_date", { ascending: false }),

        supabase.rpc("get_collateral_dashboard"),

        supabase.rpc("get_collateral_alerts"),
      ]);

    if (garantiasResultado.error) {
      setError(
        "No se pudieron cargar las garantías: " +
          garantiasResultado.error.message,
      );
      setGarantias([]);
    } else {
      setGarantias(
        (garantiasResultado.data || []) as unknown as Garantia[],
      );
    }

    if (dashboardResultado.error) {
      setError(
        "No se pudo cargar el dashboard: " +
          dashboardResultado.error.message,
      );
      setDashboard(null);
    } else {
      const fila = Array.isArray(dashboardResultado.data)
        ? dashboardResultado.data[0]
        : dashboardResultado.data;

      setDashboard(
        fila
          ? {
              total_collaterals: Number(fila.total_collaterals || 0),
              active_collaterals: Number(fila.active_collaterals || 0),
              released_collaterals: Number(fila.released_collaterals || 0),
              returned_collaterals: Number(fila.returned_collaterals || 0),
              executed_collaterals: Number(fila.executed_collaterals || 0),
              sold_collaterals: Number(fila.sold_collaterals || 0),
              overdue_loans_with_collateral: Number(
                fila.overdue_loans_with_collateral || 0,
              ),
              released_pending_return: Number(
                fila.released_pending_return || 0,
              ),
              executed_pending_sale: Number(
                fila.executed_pending_sale || 0,
              ),
              total_estimated_value: Number(
                fila.total_estimated_value || 0,
              ),
              total_accepted_value: Number(
                fila.total_accepted_value || 0,
              ),
              active_loan_debt: Number(fila.active_loan_debt || 0),
              executed_loan_debt: Number(
                fila.executed_loan_debt || 0,
              ),
              total_gross_sales: Number(
                fila.total_gross_sales || 0,
              ),
              total_sale_expenses: Number(
                fila.total_sale_expenses || 0,
              ),
              total_net_sales: Number(fila.total_net_sales || 0),
              total_applied_to_loans: Number(
                fila.total_applied_to_loans || 0,
              ),
              total_sale_remaining: Number(
                fila.total_sale_remaining || 0,
              ),
            }
          : null,
      );
    }

    if (alertasResultado.error) {
      setError(
        "No se pudieron cargar las alertas: " +
          alertasResultado.error.message,
      );
      setAlertas([]);
    } else {
      setAlertas(
        (alertasResultado.data || []).map((fila: any) => ({
          ...fila,
          total_loan_balance: Number(
            fila.total_loan_balance || 0,
          ),
          days_in_status: Number(fila.days_in_status || 0),
        })) as AlertaGarantia[],
      );
    }

    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cargarEventos(collateralId: string) {
    const resultado = await supabase
      .from("collateral_events")
      .select(
        "id, event_type, previous_status, new_status, previous_location, new_location, previous_condition, new_condition, reason, notes, created_at",
      )
      .eq("collateral_id", collateralId)
      .order("created_at", { ascending: false });

    if (resultado.error) {
      setError("No se pudo cargar el historial: " + resultado.error.message);
      setEventos([]);
    } else {
      setEventos((resultado.data || []) as Evento[]);
    }
  }

  async function cargarArchivos(collateralId: string) {
    setCargandoArchivos(true);

    const resultado = await supabase
      .from("collateral_files")
      .select(
        "id, file_category, document_type, file_name, storage_path, mime_type, file_size_bytes, description, uploaded_at",
      )
      .eq("collateral_id", collateralId)
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false });

    if (resultado.error) {
      setError(
        "No se pudieron cargar las fotografías y documentos: " +
          resultado.error.message,
      );
      setArchivos([]);
      setCargandoArchivos(false);
      return;
    }

    const filas = (resultado.data || []) as Omit<
      ArchivoGarantia,
      "signed_url"
    >[];

    const archivosConUrl = await Promise.all(
      filas.map(async (archivo) => {
        const firmado = await supabase.storage
          .from("collateral-files")
          .createSignedUrl(archivo.storage_path, 60 * 60);

        return {
          ...archivo,
          signed_url: firmado.data?.signedUrl || "",
        };
      }),
    );

    setArchivos(archivosConUrl);
    setCargandoArchivos(false);
  }

  function limpiarFormularioArchivo() {
    setArchivoSeleccionado(null);
    setTipoArchivo("other");
    setDescripcionArchivo("");

    const input = document.getElementById(
      "archivo-garantia",
    ) as HTMLInputElement | null;

    if (input) input.value = "";
  }

  async function subirArchivo(
    categoria: "photo" | "document",
  ) {
    if (!puedeGestionar) {
      setError(
        "No tienes permiso para agregar archivos a una garantía.",
      );
      return;
    }

    if (!seleccionada) return;

    if (!archivoSeleccionado) {
      setError("Debes seleccionar un archivo.");
      return;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!tiposPermitidos.includes(archivoSeleccionado.type)) {
      setError(
        "Solo puedes subir imágenes JPG, PNG, WEBP o documentos PDF.",
      );
      return;
    }

    if (archivoSeleccionado.size > 15 * 1024 * 1024) {
      setError("El archivo no puede superar 15 MB.");
      return;
    }

    if (
      categoria === "photo" &&
      !archivoSeleccionado.type.startsWith("image/")
    ) {
      setError(
        "En Fotografías solo puedes seleccionar una imagen.",
      );
      return;
    }

    setSubiendoArchivo(true);
    setError("");
    setExito("");

    const nombreSeguro = archivoSeleccionado.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const ruta = `${seleccionada.id}/${Date.now()}-${nombreSeguro}`;

    const subida = await supabase.storage
      .from("collateral-files")
      .upload(ruta, archivoSeleccionado, {
        cacheControl: "3600",
        upsert: false,
        contentType: archivoSeleccionado.type,
      });

    if (subida.error) {
      setError(
        "No se pudo subir el archivo: " + subida.error.message,
      );
      setSubiendoArchivo(false);
      return;
    }

    const registro = await supabase.rpc(
      "register_collateral_file",
      {
        p_collateral_id: seleccionada.id,
        p_file_category: categoria,
        p_document_type: tipoArchivo,
        p_file_name: archivoSeleccionado.name,
        p_storage_path: ruta,
        p_mime_type: archivoSeleccionado.type,
        p_file_size_bytes: archivoSeleccionado.size,
        p_description: descripcionArchivo.trim() || null,
      },
    );

    if (registro.error) {
      await supabase.storage
        .from("collateral-files")
        .remove([ruta]);

      setError(
        "El archivo se subió, pero no pudo registrarse: " +
          registro.error.message,
      );
      setSubiendoArchivo(false);
      return;
    }

    await Promise.all([
      cargarArchivos(seleccionada.id),
      cargarEventos(seleccionada.id),
    ]);

    setExito(
      categoria === "photo"
        ? "Fotografía agregada correctamente."
        : "Documento agregado correctamente.",
    );
    limpiarFormularioArchivo();
    setSubiendoArchivo(false);
  }

  async function desactivarArchivo(archivo: ArchivoGarantia) {
    if (!puedeGestionar) {
      setError(
        "No tienes permiso para retirar archivos de una garantía.",
      );
      return;
    }

    if (!seleccionada) return;

    const motivoEliminacion = window.prompt(
      `Indica el motivo para retirar "${archivo.file_name}" del expediente:`,
    );

    if (!motivoEliminacion?.trim()) return;

    const confirmar = window.confirm(
      "El archivo dejará de mostrarse, pero conservará su registro de auditoría. ¿Deseas continuar?",
    );

    if (!confirmar) return;

    setError("");
    setExito("");

    const resultado = await supabase.rpc(
      "deactivate_collateral_file",
      {
        p_file_id: archivo.id,
        p_reason: motivoEliminacion.trim(),
      },
    );

    if (resultado.error) {
      setError(
        "No se pudo retirar el archivo: " +
          resultado.error.message,
      );
      return;
    }

    await Promise.all([
      cargarArchivos(seleccionada.id),
      cargarEventos(seleccionada.id),
    ]);

    setExito("Archivo retirado correctamente del expediente.");
  }

  async function abrirDetalle(garantia: Garantia) {
    setSeleccionada(garantia);
    setPestanaActiva("informacion");
    setEventos([]);
    setArchivos([]);
    setError("");
    setExito("");
    setAccion(null);
    limpiarFormularioArchivo();
    setCargandoDetalle(true);
    await Promise.all([
      cargarEventos(garantia.id),
      cargarArchivos(garantia.id),
    ]);
    setCargandoDetalle(false);
  }

  function abrirAccion(
    tipoAccion: "ubicacion" | "condicion" | "devolver" | "ejecutar",
  ) {
    const permisoValido =
      tipoAccion === "ejecutar"
        ? puedeEjecutar
        : puedeGestionar;

    if (!permisoValido) {
      setError(
        tipoAccion === "ejecutar"
          ? "No tienes permiso para ejecutar garantías."
          : "No tienes permiso para modificar garantías.",
      );
      return;
    }

    if (!seleccionada) return;

    setAccion(tipoAccion);
    if (tipoAccion === "ubicacion") {
      setNuevoValor(seleccionada.storage_location || "");
    } else if (tipoAccion === "condicion") {
      setNuevoValor(seleccionada.physical_condition || "");
    } else {
      setNuevoValor("");
    }

    setMotivo("");
    setNotasAccion("");
    setTipoReceptor("holder");
    setRecibidoPor(
      tipoAccion === "devolver" && seleccionada.clients
        ? `${seleccionada.clients.first_name} ${seleccionada.clients.last_name}`
        : "",
    );
    setDocumentoReceptor(
      tipoAccion === "devolver"
        ? seleccionada.clients?.document_number || ""
        : "",
    );
    setTelefonoReceptor(
      tipoAccion === "devolver"
        ? seleccionada.clients?.phone_primary || ""
        : "",
    );
    setRelacionReceptor("");
    setCondicionEntrega(seleccionada.physical_condition || "");
    setEntregaConfirmada(false);
    setError("");
    setExito("");
  }

  function cancelarAccion() {
    if (guardandoAccion) return;

    setAccion(null);
    setNuevoValor("");
    setMotivo("");
    setNotasAccion("");
    setTipoReceptor("holder");
    setRecibidoPor("");
    setDocumentoReceptor("");
    setTelefonoReceptor("");
    setRelacionReceptor("");
    setCondicionEntrega(seleccionada?.physical_condition || "");
    setEntregaConfirmada(false);
  }

  async function guardarAccion() {
    if (!seleccionada || !accion) return;

    const permisoValido =
      accion === "ejecutar"
        ? puedeEjecutar
        : puedeGestionar;

    if (!permisoValido) {
      setError(
        accion === "ejecutar"
          ? "No tienes permiso para ejecutar garantías."
          : "No tienes permiso para modificar garantías.",
      );
      cancelarAccion();
      return;
    }

    if (
      (accion === "ubicacion" || accion === "condicion") &&
      nuevoValor.trim() === ""
    ) {
      setError(
        accion === "ubicacion"
          ? "Debes indicar la nueva ubicación."
          : "Debes describir la nueva condición física.",
      );
      return;
    }

    if (accion === "devolver") {
      if (recibidoPor.trim() === "") {
        setError("Debes indicar quién recibe la garantía.");
        return;
      }

      if (
        tipoReceptor === "authorized_person" &&
        documentoReceptor.trim() === ""
      ) {
        setError(
          "Debes indicar el documento de la persona autorizada.",
        );
        return;
      }

      if (
        tipoReceptor === "authorized_person" &&
        relacionReceptor.trim() === ""
      ) {
        setError(
          "Debes indicar la relación de la persona autorizada con el cliente.",
        );
        return;
      }

      if (!entregaConfirmada) {
        setError(
          "Debes confirmar que la garantía fue entregada.",
        );
        return;
      }
    }

    if (accion === "ejecutar" && motivo.trim() === "") {
      setError("Debes indicar el motivo de la ejecución.");
      return;
    }

    setGuardandoAccion(true);
    setError("");
    setExito("");

    let nombreFuncion = "";
    let parametros: Record<string, string | boolean | null> = {
      p_collateral_id: seleccionada.id,
    };

    if (accion === "ubicacion") {
      nombreFuncion = "change_collateral_location";
      parametros = {
        ...parametros,
        p_new_location: nuevoValor.trim(),
        p_reason: motivo.trim() || null,
        p_notes: notasAccion.trim() || null,
      };
    } else if (accion === "condicion") {
      nombreFuncion = "change_collateral_condition";
      parametros = {
        ...parametros,
        p_new_condition: nuevoValor.trim(),
        p_reason: motivo.trim() || null,
        p_notes: notasAccion.trim() || null,
      };
    } else if (accion === "devolver") {
      nombreFuncion = "return_loan_collateral";
      parametros = {
        ...parametros,
        p_receiver_type: tipoReceptor,
        p_received_by_name: recibidoPor.trim(),
        p_receiver_document: documentoReceptor.trim() || null,
        p_receiver_phone: telefonoReceptor.trim() || null,
        p_receiver_relationship:
          tipoReceptor === "holder"
            ? "Titular"
            : relacionReceptor.trim() || null,
        p_return_condition: condicionEntrega.trim() || null,
        p_confirmed: entregaConfirmada,
        p_notes: notasAccion.trim() || null,
      };
    } else if (accion === "ejecutar") {
      nombreFuncion = "execute_loan_collateral";
      parametros = {
        ...parametros,
        p_reason: motivo.trim(),
        p_notes: notasAccion.trim() || null,
      };
    }

    const resultado = await supabase.rpc(nombreFuncion, parametros);

    if (resultado.error) {
      setError(
        "No se pudo guardar el cambio: " + resultado.error.message,
      );
      setGuardandoAccion(false);
      return;
    }

    const actualizada: Garantia = {
      ...seleccionada,
      storage_location:
        accion === "ubicacion"
          ? nuevoValor.trim()
          : seleccionada.storage_location,
      physical_condition:
        accion === "condicion"
          ? nuevoValor.trim()
          : seleccionada.physical_condition,
      collateral_status:
        accion === "devolver"
          ? "returned"
          : accion === "ejecutar"
            ? "executed"
            : seleccionada.collateral_status,
    };

    setSeleccionada(actualizada);
    setGarantias((lista) =>
      lista.map((item) =>
        item.id === actualizada.id ? actualizada : item,
      ),
    );

    await cargarEventos(seleccionada.id);

    const mensajes: Record<string, string> = {
      ubicacion: "Ubicación actualizada correctamente.",
      condicion: "Condición física actualizada correctamente.",
      devolver: "Garantía devuelta correctamente.",
      ejecutar: "Garantía ejecutada correctamente.",
    };

    setExito(mensajes[accion]);

    setAccion(null);
    setNuevoValor("");
    setMotivo("");
    setNotasAccion("");
    setTipoReceptor("holder");
    setRecibidoPor("");
    setDocumentoReceptor("");
    setTelefonoReceptor("");
    setRelacionReceptor("");
    setCondicionEntrega(actualizada.physical_condition || "");
    setEntregaConfirmada(false);
    setGuardandoAccion(false);
  }

  const tipos = useMemo(
    () =>
      Array.from(new Set(garantias.map((item) => item.collateral_type))).sort(),
    [garantias],
  );

  const ubicaciones = useMemo(
    () =>
      Array.from(
        new Set(
          garantias
            .map((item) => item.storage_location || "")
            .filter(Boolean),
        ),
      ).sort(),
    [garantias],
  );

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return garantias.filter((garantia) => {
      const cliente = garantia.clients
        ? `${garantia.clients.first_name} ${garantia.clients.last_name}`.toLowerCase()
        : "";

      const coincideBusqueda =
        termino === "" ||
        cliente.includes(termino) ||
        (garantia.loans?.loan_number || "").toLowerCase().includes(termino) ||
        garantia.description.toLowerCase().includes(termino) ||
        (garantia.serial_number || "").toLowerCase().includes(termino) ||
        (garantia.plate_number || "").toLowerCase().includes(termino) ||
        (garantia.chassis_number || "").toLowerCase().includes(termino) ||
        (garantia.title_number || "").toLowerCase().includes(termino);

      return (
        coincideBusqueda &&
        (estado === "all" || garantia.collateral_status === estado) &&
        (tipo === "all" || garantia.collateral_type === tipo) &&
        (ubicacion === "all" || garantia.storage_location === ubicacion)
      );
    });
  }, [garantias, busqueda, estado, tipo, ubicacion]);

  const resumenLocal = useMemo(
    () => ({
      activas: garantias.filter((item) =>
        ["received", "stored", "released"].includes(
          item.collateral_status,
        ),
      ).length,
      devueltas: garantias.filter(
        (item) => item.collateral_status === "returned",
      ).length,
      ejecutadas: garantias.filter(
        (item) => item.collateral_status === "executed",
      ).length,
      aceptado: garantias.reduce(
        (total, item) =>
          total + Number(item.accepted_value || 0),
        0,
      ),
      estimado: garantias.reduce(
        (total, item) =>
          total + Number(item.estimated_value || 0),
        0,
      ),
    }),
    [garantias],
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-blue-900">Garantías</h1>
        <p className="mt-2 text-gray-600">
          Consulta y organiza las garantías vinculadas a los préstamos.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {exito && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {exito}
          </div>
        )}

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Resumen
            titulo="Total"
            valor={String(
              dashboard?.total_collaterals ??
                garantias.length,
            )}
          />
          <Resumen
            titulo="Activas"
            valor={String(
              dashboard?.active_collaterals ??
                resumenLocal.activas,
            ).replace("undefined", String(resumenLocal.activas))}
          />
          <Resumen
            titulo="Liberadas"
            valor={String(
              dashboard?.released_collaterals || 0,
            )}
          />
          <Resumen
            titulo="Devueltas"
            valor={String(
              dashboard?.returned_collaterals ??
                resumenLocal.devueltas,
            )}
          />
          <Resumen
            titulo="Ejecutadas"
            valor={String(
              dashboard?.executed_collaterals ??
                resumenLocal.ejecutadas,
            )}
          />
          <Resumen
            titulo="Vendidas"
            valor={String(
              dashboard?.sold_collaterals || 0,
            )}
          />
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Resumen
            titulo="Valor aceptado"
            valor={formatearMonto(
              dashboard?.total_accepted_value ??
                resumenLocal.aceptado,
            )}
          />
          <Resumen
            titulo="Valor estimado"
            valor={formatearMonto(
              dashboard?.total_estimated_value ??
                resumenLocal.estimado,
            )}
          />
          <Resumen
            titulo="Deuda respaldada activa"
            valor={formatearMonto(
              dashboard?.active_loan_debt || 0,
            )}
          />
          <Resumen
            titulo="Deuda en garantías ejecutadas"
            valor={formatearMonto(
              dashboard?.executed_loan_debt || 0,
            )}
          />
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Resumen
            titulo="Ventas brutas"
            valor={formatearMonto(
              dashboard?.total_gross_sales || 0,
            )}
          />
          <Resumen
            titulo="Gastos de venta"
            valor={formatearMonto(
              dashboard?.total_sale_expenses || 0,
            )}
          />
          <Resumen
            titulo="Ventas netas"
            valor={formatearMonto(
              dashboard?.total_net_sales || 0,
            )}
          />
          <Resumen
            titulo="Aplicado a préstamos"
            valor={formatearMonto(
              dashboard?.total_applied_to_loans || 0,
            )}
          />
          <Resumen
            titulo="Remanentes"
            valor={formatearMonto(
              dashboard?.total_sale_remaining || 0,
            )}
          />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Alertas operativas
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Préstamos vencidos, garantías liberadas pendientes de devolución y ejecutadas pendientes de venta.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <IndicadorAlerta
                etiqueta="Vencidos"
                valor={
                  dashboard?.overdue_loans_with_collateral ||
                  0
                }
              />
              <IndicadorAlerta
                etiqueta="Por devolver"
                valor={
                  dashboard?.released_pending_return || 0
                }
              />
              <IndicadorAlerta
                etiqueta="Por vender"
                valor={
                  dashboard?.executed_pending_sale || 0
                }
              />
            </div>
          </div>

          {alertas.length === 0 ? (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
              No hay alertas operativas pendientes.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {alertas.map((alerta) => (
                <div
                  key={`${alerta.collateral_id}-${alerta.alert_type}`}
                  className={
                    alerta.alert_priority === "high"
                      ? "rounded-xl border border-red-200 bg-red-50 p-4"
                      : "rounded-xl border border-amber-200 bg-amber-50 p-4"
                  }
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            alerta.alert_priority === "high"
                              ? "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800"
                              : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                          }
                        >
                          {alerta.alert_priority === "high"
                            ? "Alta"
                            : "Media"}
                        </span>
                        <span className="text-sm font-semibold text-blue-900">
                          {textoAlerta(alerta.alert_type)}
                        </span>
                      </div>

                      <p className="mt-2 font-semibold text-gray-900">
                        {alerta.client_name} ·{" "}
                        {alerta.loan_number}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {alerta.collateral_description}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {alerta.alert_message}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        Balance:{" "}
                        <strong>
                          {formatearMonto(
                            alerta.total_loan_balance,
                          )}
                        </strong>{" "}
                        · {alerta.days_in_status} día(s)
                      </p>
                    </div>

                    <Link
                      href={`/garantias/${alerta.collateral_id}`}
                      className="inline-flex rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Abrir expediente
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar cliente, préstamo, placa o título..."
              className="rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
            />

            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <option value="all">Todos los estados</option>
              <option value="received">Recibidas</option>
              <option value="stored">En resguardo</option>
              <option value="released">Liberadas</option>
              <option value="returned">Devueltas</option>
              <option value="executed">Ejecutadas</option>
              <option value="sold">Vendidas</option>
              <option value="lost">Extraviadas</option>
              <option value="cancelled">Canceladas</option>
            </select>

            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <option value="all">Todos los tipos</option>
              {tipos.map((valor) => (
                <option key={valor} value={valor}>
                  {textoTipo(valor)}
                </option>
              ))}
            </select>

            <select
              value={ubicacion}
              onChange={(event) => setUbicacion(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <option value="all">Todas las ubicaciones</option>
              {ubicaciones.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Cliente",
                    "Préstamo",
                    "Tipo",
                    "Descripción",
                    "Valor aceptado",
                    "Estado",
                    "Ubicación",
                    "Fecha",
                    "Acción",
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
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Cargando garantías...
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No hay garantías para mostrar.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((garantia) => (
                    <tr key={garantia.id}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {nombreCliente(garantia)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {garantia.loans?.loan_number || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {textoTipo(garantia.collateral_type)}
                      </td>
                      <td className="max-w-xs px-4 py-4 text-sm text-gray-700">
                        {garantia.description}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-blue-900">
                        {formatearMonto(
                          Number(garantia.accepted_value || 0),
                          garantia.loans?.currencies || null,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={claseEstado(garantia.collateral_status)}>
                          {textoEstado(garantia.collateral_status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {garantia.storage_location || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {formatearFecha(garantia.received_date)}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/garantias/${garantia.id}`}
                          className="inline-flex rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {seleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Detalle de la garantía
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {textoTipo(seleccionada.collateral_type)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSeleccionada(null);
                  setPestanaActiva("informacion");
                }}
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
              <button
                type="button"
                onClick={() => {
                  setPestanaActiva("informacion");
                  limpiarFormularioArchivo();
                }}
                className={
                  pestanaActiva === "informacion"
                    ? "rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white"
                    : "rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                }
              >
                Información
              </button>
              <button
                type="button"
                onClick={() => {
                  setPestanaActiva("fotografias");
                  limpiarFormularioArchivo();
                }}
                className={
                  pestanaActiva === "fotografias"
                    ? "rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white"
                    : "rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                }
              >
                Fotografías
              </button>
              <button
                type="button"
                onClick={() => {
                  setPestanaActiva("documentos");
                  limpiarFormularioArchivo();
                }}
                className={
                  pestanaActiva === "documentos"
                    ? "rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white"
                    : "rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                }
              >
                Documentos
              </button>
              <button
                type="button"
                onClick={() => {
                  setPestanaActiva("historial");
                  limpiarFormularioArchivo();
                }}
                className={
                  pestanaActiva === "historial"
                    ? "rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white"
                    : "rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                }
              >
                Historial
              </button>
            </div>

            {pestanaActiva === "informacion" && (
              <div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Dato titulo="Cliente" valor={nombreCliente(seleccionada)} />
              <Dato titulo="Préstamo" valor={seleccionada.loans?.loan_number || "—"} />
              <Dato titulo="Estado" valor={textoEstado(seleccionada.collateral_status)} />
              <Dato titulo="Descripción" valor={seleccionada.description} />
              <Dato
                titulo="Marca y modelo"
                valor={[seleccionada.brand, seleccionada.model].filter(Boolean).join(" ") || "—"}
              />
              <Dato titulo="Año" valor={seleccionada.manufacture_year ? String(seleccionada.manufacture_year) : "—"} />
              <Dato titulo="Serie" valor={seleccionada.serial_number || "—"} />
              <Dato titulo="Matrícula" valor={seleccionada.registration_number || "—"} />
              <Dato titulo="Placa" valor={seleccionada.plate_number || "—"} />
              <Dato titulo="Chasis" valor={seleccionada.chassis_number || "—"} />
              <Dato titulo="Título" valor={seleccionada.title_number || "—"} />
              <Dato titulo="Condición" valor={seleccionada.physical_condition || "—"} />
              <Dato titulo="Valor estimado" valor={formatearMonto(Number(seleccionada.estimated_value || 0), seleccionada.loans?.currencies || null)} />
              <Dato titulo="Valor aceptado" valor={formatearMonto(Number(seleccionada.accepted_value || 0), seleccionada.loans?.currencies || null)} />
              <Dato titulo="Ubicación" valor={seleccionada.storage_location || "—"} />
              <Dato titulo="Fecha recibida" valor={formatearFecha(seleccionada.received_date)} />
              <Dato titulo="Balance préstamo" valor={formatearMonto(totalPendiente(seleccionada.loans), seleccionada.loans?.currencies || null)} />
              <Dato titulo="Frecuencia" valor={textoFrecuencia(seleccionada.loans?.interest_frequency || "")} />
            </div>

            {seleccionada.notes && (
              <div className="mt-6 rounded-xl bg-slate-50 p-5">
                <h3 className="font-bold text-blue-900">Observaciones</h3>
                <p className="mt-2 text-gray-700">{seleccionada.notes}</p>
              </div>
            )}
              </div>
            )}

            {pestanaActiva === "fotografias" && (
              <ArchivoSeccion
                puedeGestionar={puedeGestionar}
                categoria="photo"
                titulo="Fotografías"
                archivos={archivos.filter(
                  (archivo) => archivo.file_category === "photo",
                )}
                cargando={cargandoArchivos}
                archivoSeleccionado={archivoSeleccionado}
                tipoArchivo={tipoArchivo}
                descripcionArchivo={descripcionArchivo}
                subiendo={subiendoArchivo}
                cambiarArchivo={setArchivoSeleccionado}
                cambiarTipo={setTipoArchivo}
                cambiarDescripcion={setDescripcionArchivo}
                subir={() => void subirArchivo("photo")}
                abrir={(archivo) =>
                  window.open(archivo.signed_url, "_blank")
                }
                desactivar={(archivo) =>
                  void desactivarArchivo(archivo)
                }
              />
            )}

            {pestanaActiva === "documentos" && (
              <ArchivoSeccion
                puedeGestionar={puedeGestionar}
                categoria="document"
                titulo="Documentos"
                archivos={archivos.filter(
                  (archivo) =>
                    archivo.file_category === "document",
                )}
                cargando={cargandoArchivos}
                archivoSeleccionado={archivoSeleccionado}
                tipoArchivo={tipoArchivo}
                descripcionArchivo={descripcionArchivo}
                subiendo={subiendoArchivo}
                cambiarArchivo={setArchivoSeleccionado}
                cambiarTipo={setTipoArchivo}
                cambiarDescripcion={setDescripcionArchivo}
                subir={() => void subirArchivo("document")}
                abrir={(archivo) =>
                  window.open(archivo.signed_url, "_blank")
                }
                desactivar={(archivo) =>
                  void desactivarArchivo(archivo)
                }
              />
            )}

            {pestanaActiva === "historial" && (
            <section className="mt-6 rounded-xl bg-slate-50 p-5">
              <h3 className="font-bold text-blue-900">Línea de tiempo</h3>

              {cargandoDetalle ? (
                <p className="mt-4 text-gray-500">Cargando historial...</p>
              ) : eventos.length === 0 ? (
                <p className="mt-4 text-gray-500">No hay eventos registrados.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {eventos.map((evento) => (
                    <div
                      key={evento.id}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                        <div>
                          <p className="font-bold text-blue-900">
                            {textoEvento(evento.event_type)}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {descripcionEvento(evento)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatearFechaHora(evento.created_at)}
                        </p>
                      </div>
                      {evento.reason && (
                        <p className="mt-3 text-sm text-gray-700">
                          <strong>Motivo:</strong> {evento.reason}
                        </p>
                      )}
                      {evento.notes && (
                        <p className="mt-2 text-sm text-gray-700">
                          <strong>Nota:</strong> {evento.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {accion && (
              <section
                className={
                  accion === "ejecutar"
                    ? "mt-6 rounded-xl border border-red-200 bg-red-50 p-5"
                    : accion === "devolver"
                      ? "mt-6 rounded-xl border border-green-200 bg-green-50 p-5"
                      : "mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5"
                }
              >
                <h3 className="font-bold text-blue-900">
                  {accion === "ubicacion" && "Cambiar ubicación"}
                  {accion === "condicion" && "Cambiar condición física"}
                  {accion === "devolver" && "Devolver garantía"}
                  {accion === "ejecutar" && "Ejecutar garantía"}
                </h3>

                {(accion === "ubicacion" || accion === "condicion") && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700">
                      {accion === "ubicacion"
                        ? "Nueva ubicación"
                        : "Nueva condición física"}
                    </label>
                    <input
                      type="text"
                      value={nuevoValor}
                      onChange={(event) =>
                        setNuevoValor(event.target.value)
                      }
                      placeholder={
                        accion === "ubicacion"
                          ? "Ejemplo: Caja fuerte principal"
                          : "Ejemplo: Buena, sin daños visibles"
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                    />
                  </div>
                )}

                {accion === "devolver" && (
                  <div className="mt-4 space-y-5">
                    <div className="rounded-xl border border-green-200 bg-white p-4">
                      <p className="font-semibold text-green-900">
                        ¿Quién recibe la garantía?
                      </p>

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
                          <input
                            type="radio"
                            name="tipo-receptor"
                            checked={tipoReceptor === "holder"}
                            onChange={() => {
                              setTipoReceptor("holder");
                              setRecibidoPor(
                                seleccionada.clients
                                  ? `${seleccionada.clients.first_name} ${seleccionada.clients.last_name}`
                                  : "",
                              );
                              setDocumentoReceptor(
                                seleccionada.clients?.document_number || "",
                              );
                              setTelefonoReceptor(
                                seleccionada.clients?.phone_primary || "",
                              );
                              setRelacionReceptor("");
                            }}
                          />
                          Titular
                        </label>

                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
                          <input
                            type="radio"
                            name="tipo-receptor"
                            checked={
                              tipoReceptor === "authorized_person"
                            }
                            onChange={() => {
                              setTipoReceptor("authorized_person");
                              setRecibidoPor("");
                              setDocumentoReceptor("");
                              setTelefonoReceptor("");
                              setRelacionReceptor("");
                            }}
                          />
                          Otra persona autorizada
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Nombre de quien recibe
                        </label>
                        <input
                          type="text"
                          value={recibidoPor}
                          onChange={(event) =>
                            setRecibidoPor(event.target.value)
                          }
                          className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-green-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Documento
                        </label>
                        <input
                          type="text"
                          value={documentoReceptor}
                          onChange={(event) =>
                            setDocumentoReceptor(event.target.value)
                          }
                          placeholder={
                            tipoReceptor === "authorized_person"
                              ? "Obligatorio"
                              : "Opcional"
                          }
                          className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-green-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Teléfono
                        </label>
                        <input
                          type="text"
                          value={telefonoReceptor}
                          onChange={(event) =>
                            setTelefonoReceptor(event.target.value)
                          }
                          placeholder="Opcional"
                          className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-green-700"
                        />
                      </div>

                      {tipoReceptor === "authorized_person" && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700">
                            Relación con el cliente
                          </label>
                          <input
                            type="text"
                            value={relacionReceptor}
                            onChange={(event) =>
                              setRelacionReceptor(event.target.value)
                            }
                            placeholder="Ejemplo: Madre, esposo, representante"
                            className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-green-700"
                          />
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Condición al momento de entregar
                        </label>
                        <input
                          type="text"
                          value={condicionEntrega}
                          onChange={(event) =>
                            setCondicionEntrega(event.target.value)
                          }
                          placeholder="Ejemplo: Entregada en buen estado, sin daños visibles"
                          className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-green-700"
                        />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-green-300 bg-green-100 p-4">
                      <input
                        type="checkbox"
                        checked={entregaConfirmada}
                        onChange={(event) =>
                          setEntregaConfirmada(event.target.checked)
                        }
                        className="mt-1 h-4 w-4"
                      />
                      <span className="text-sm font-semibold text-green-900">
                        Confirmo que la garantía fue entregada a la
                        persona indicada y que la información registrada
                        es correcta.
                      </span>
                    </label>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {accion !== "devolver" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Motivo
                      </label>
                      <input
                        type="text"
                        value={motivo}
                        onChange={(event) =>
                          setMotivo(event.target.value)
                        }
                        placeholder={
                          accion === "ejecutar"
                            ? "Obligatorio"
                            : "Opcional"
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                      />
                    </div>
                  )}

                  <div className={accion === "devolver" ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-semibold text-gray-700">
                      Observaciones
                    </label>
                    {accion === "devolver" ? (
                      <textarea
                        rows={3}
                        value={notasAccion}
                        onChange={(event) =>
                          setNotasAccion(event.target.value)
                        }
                        placeholder="Detalles de la entrega, accesorios entregados o cualquier observación relevante"
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-green-700"
                      />
                    ) : (
                      <input
                        type="text"
                        value={notasAccion}
                        onChange={(event) =>
                          setNotasAccion(event.target.value)
                        }
                        placeholder="Opcional"
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                      />
                    )}
                  </div>
                </div>

                {accion === "devolver" && (
                  <p className="mt-4 rounded-lg bg-white p-3 text-sm text-green-800">
                    La devolución solo será permitida cuando el préstamo
                    esté totalmente pagado y la garantía figure como
                    Liberada.
                  </p>
                )}

                {accion === "ejecutar" && (
                  <p className="mt-4 rounded-lg bg-white p-3 text-sm text-red-800">
                    Esta acción marcará la garantía como ejecutada.
                    Debe utilizarse únicamente cuando corresponda por
                    incumplimiento.
                  </p>
                )}

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelarAccion}
                    disabled={guardandoAccion}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void guardarAccion()}
                    disabled={guardandoAccion}
                    className={
                      accion === "ejecutar"
                        ? "rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                        : accion === "devolver"
                          ? "rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                          : "rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    }
                  >
                    {guardandoAccion
                      ? "Guardando..."
                      : accion === "devolver"
                        ? "Confirmar devolución"
                        : accion === "ejecutar"
                          ? "Confirmar ejecución"
                          : "Guardar cambio"}
                  </button>
                </div>
              </section>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {!accion &&
                !["returned", "executed"].includes(
                  seleccionada.collateral_status,
                ) && (
                  <>
                    <button
                      type="button"
                      onClick={() => abrirAccion("ubicacion")}
                      className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                    >
                      Cambiar ubicación
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirAccion("condicion")}
                      className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700"
                    >
                      Cambiar condición
                    </button>
                  </>
                )}

              {!accion &&
                !["returned", "executed"].includes(
                  seleccionada.collateral_status,
                ) && (
                  <>
                    <button
                      type="button"
                      onClick={() => abrirAccion("devolver")}
                      className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                    >
                      Devolver garantía
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirAccion("ejecutar")}
                      className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                    >
                      Ejecutar garantía
                    </button>
                  </>
                )}

              <button
                type="button"
                onClick={() => {
                  if (!guardandoAccion) {
                    setSeleccionada(null);
                    setAccion(null);
                    setExito("");
                  }
                }}
                className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function nombreCliente(garantia: Garantia) {
  return garantia.clients
    ? `${garantia.clients.first_name} ${garantia.clients.last_name}`
    : "Cliente no disponible";
}

function totalPendiente(prestamo: Prestamo | null) {
  if (!prestamo) return 0;
  return (
    Number(prestamo.principal_balance) +
    Number(prestamo.interest_balance) +
    Number(prestamo.late_fee_balance)
  );
}

function formatearMonto(monto: number, moneda: Moneda | null = null) {
  return `${moneda?.symbol || "RD$"} ${Number(monto).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-DO");
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function textoTipo(tipo: string) {
  const tipos: Record<string, string> = {
    vehicle: "Vehículo",
    jewelry: "Prenda o joya",
    article: "Artículo",
    appliance: "Electrodoméstico",
    property_title: "Título de propiedad",
    land: "Terreno o solar",
    house: "Vivienda",
    registration: "Matrícula",
    legal_document: "Documento legal",
    other: "Otra garantía",
  };
  return tipos[tipo] || tipo;
}

function textoEstado(estado: string) {
  const estados: Record<string, string> = {
    received: "Recibida",
    stored: "En resguardo",
    released: "Liberada",
    returned: "Devuelta",
    executed: "Ejecutada",
    sold: "Vendida",
    lost: "Extraviada",
    cancelled: "Cancelada",
  };
  return estados[estado] || estado;
}

function claseEstado(estado: string) {
  const base = "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ";
  if (["received", "stored", "released"].includes(estado)) {
    return base + "bg-amber-100 text-amber-800";
  }
  if (estado === "returned") {
    return base + "bg-green-100 text-green-800";
  }
  if (["executed", "sold"].includes(estado)) {
    return base + "bg-red-100 text-red-800";
  }
  return base + "bg-gray-200 text-gray-700";
}

function textoFrecuencia(valor: string) {
  if (valor === "weekly") return "Semanal";
  if (valor === "biweekly") return "Quincenal";
  if (valor === "monthly") return "Mensual";
  return "—";
}

function textoEvento(tipo: string) {
  const eventos: Record<string, string> = {
    received: "Garantía recibida",
    status_changed: "Estado actualizado",
    location_changed: "Ubicación cambiada",
    condition_changed: "Condición actualizada",
    valuation_changed: "Valoración actualizada",
    released: "Garantía liberada",
    returned: "Garantía devuelta",
    executed: "Garantía ejecutada",
    note_added: "Nota agregada",
    document_added: "Documento agregado",
    photo_added: "Fotografía agregada",
  };
  return eventos[tipo] || tipo;
}

function descripcionEvento(evento: Evento) {
  if (evento.event_type === "location_changed") {
    return `${evento.previous_location || "Sin ubicación"} → ${
      evento.new_location || "Sin ubicación"
    }`;
  }
  if (evento.event_type === "condition_changed") {
    return `${evento.previous_condition || "Sin condición"} → ${
      evento.new_condition || "Sin condición"
    }`;
  }
  if (evento.new_status) {
    return `Estado: ${textoEstado(evento.new_status)}`;
  }
  return "Movimiento registrado";
}


function ArchivoSeccion({
  puedeGestionar,
  categoria,
  titulo,
  archivos,
  cargando,
  archivoSeleccionado,
  tipoArchivo,
  descripcionArchivo,
  subiendo,
  cambiarArchivo,
  cambiarTipo,
  cambiarDescripcion,
  subir,
  abrir,
  desactivar,
}: {
  puedeGestionar: boolean;
  categoria: "photo" | "document";
  titulo: string;
  archivos: ArchivoGarantia[];
  cargando: boolean;
  archivoSeleccionado: File | null;
  tipoArchivo: string;
  descripcionArchivo: string;
  subiendo: boolean;
  cambiarArchivo: (archivo: File | null) => void;
  cambiarTipo: (tipo: string) => void;
  cambiarDescripcion: (descripcion: string) => void;
  subir: () => void;
  abrir: (archivo: ArchivoGarantia) => void;
  desactivar: (archivo: ArchivoGarantia) => void;
}) {
  const opciones =
    categoria === "photo"
      ? [
          ["front", "Frente"],
          ["back", "Parte trasera"],
          ["side", "Lateral"],
          ["interior", "Interior"],
          ["serial", "Número de serie"],
          ["chassis", "Chasis"],
          ["engine", "Motor"],
          ["other", "Otra fotografía"],
        ]
      : [
          ["registration", "Matrícula"],
          ["title", "Título"],
          ["contract", "Contrato"],
          ["valuation", "Tasación"],
          ["identity", "Identificación"],
          ["receipt", "Recibo"],
          ["other", "Otro documento"],
        ];

  return (
    <section className="mt-6 rounded-xl bg-slate-50 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-blue-900">
            {titulo}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {categoria === "photo"
              ? "Agrega imágenes claras que permitan identificar y comprobar el estado de la garantía."
              : "Adjunta matrículas, títulos, contratos, tasaciones y demás documentos del expediente."}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-blue-900">
          {archivos.length} archivo(s)
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
        <h4 className="font-semibold text-gray-900">
          Agregar {categoria === "photo" ? "fotografía" : "documento"}
        </h4>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Archivo
            </label>
            <input
              id="archivo-garantia"
            disabled={!puedeGestionar}
              type="file"
              accept={
                categoria === "photo"
                  ? "image/jpeg,image/png,image/webp"
                  : "image/jpeg,image/png,image/webp,application/pdf"
              }
              onChange={(event) =>
                cambiarArchivo(event.target.files?.[0] || null)
              }
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Máximo 15 MB. Formatos JPG, PNG, WEBP
              {categoria === "document" ? " o PDF." : "."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Tipo
            </label>
            <select
              value={tipoArchivo}
              onChange={(event) =>
                cambiarTipo(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3"
            >
              {opciones.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">
              Descripción
            </label>
            <input
              type="text"
              value={descripcionArchivo}
              onChange={(event) =>
                cambiarDescripcion(event.target.value)
              }
              placeholder="Ejemplo: Foto frontal tomada al recibir la garantía"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
            />
          </div>
        </div>

        {archivoSeleccionado && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-gray-700">
            <strong>Seleccionado:</strong>{" "}
            {archivoSeleccionado.name} ·{" "}
            {formatearTamano(archivoSeleccionado.size)}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={subir}
            disabled={subiendo}
            className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {subiendo
              ? "Subiendo..."
              : categoria === "photo"
                ? "Subir fotografía"
                : "Subir documento"}
          </button>
        </div>
      </div>

      {cargando ? (
        <p className="mt-5 text-gray-500">
          Cargando archivos...
        </p>
      ) : archivos.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          Todavía no hay {categoria === "photo" ? "fotografías" : "documentos"} registrados.
        </div>
      ) : categoria === "photo" ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archivos.map((archivo) => (
            <div
              key={archivo.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              {archivo.signed_url ? (
                <button
                  type="button"
                  onClick={() => abrir(archivo)}
                  className="block h-48 w-full bg-slate-100"
                >
                  <img
                    src={archivo.signed_url}
                    alt={archivo.description || archivo.file_name}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-gray-500">
                  Vista previa no disponible
                </div>
              )}

              <div className="p-4">
                <p className="font-semibold text-gray-900">
                  {textoTipoArchivo(archivo.document_type)}
                </p>
                <p className="mt-1 break-all text-sm text-gray-600">
                  {archivo.file_name}
                </p>
                {archivo.description && (
                  <p className="mt-2 text-sm text-gray-700">
                    {archivo.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {formatearTamano(archivo.file_size_bytes)} ·{" "}
                  {formatearFechaHora(archivo.uploaded_at)}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => abrir(archivo)}
                    disabled={!archivo.signed_url}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => desactivar(archivo)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Retirar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Tipo",
                  "Archivo",
                  "Descripción",
                  "Tamaño",
                  "Fecha",
                  "Acciones",
                ].map((encabezado) => (
                  <th
                    key={encabezado}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                  >
                    {encabezado}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {archivos.map((archivo) => (
                <tr key={archivo.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                    {textoTipoArchivo(archivo.document_type)}
                  </td>
                  <td className="max-w-xs break-all px-4 py-4 text-sm font-medium text-gray-900">
                    {archivo.file_name}
                  </td>
                  <td className="max-w-sm px-4 py-4 text-sm text-gray-700">
                    {archivo.description || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                    {formatearTamano(archivo.file_size_bytes)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                    {formatearFechaHora(archivo.uploaded_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrir(archivo)}
                        disabled={!archivo.signed_url}
                        className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => desactivar(archivo)}
                        className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Retirar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function textoTipoArchivo(tipo: string | null) {
  const tipos: Record<string, string> = {
    front: "Frente",
    back: "Parte trasera",
    side: "Lateral",
    interior: "Interior",
    serial: "Número de serie",
    chassis: "Chasis",
    engine: "Motor",
    registration: "Matrícula",
    title: "Título",
    contract: "Contrato",
    valuation: "Tasación",
    identity: "Identificación",
    receipt: "Recibo",
    other: "Otro",
  };

  return tipos[tipo || "other"] || tipo || "Otro";
}

function formatearTamano(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";

  const unidades = ["B", "KB", "MB", "GB"];
  const indice = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    unidades.length - 1,
  );

  return `${(bytes / 1024 ** indice).toFixed(
    indice === 0 ? 0 : 1,
  )} ${unidades[indice]}`;
}

function IndicadorAlerta({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: number;
}) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
      <span className="text-gray-600">{etiqueta}: </span>
      <strong className="text-blue-900">{valor}</strong>
    </div>
  );
}

function textoAlerta(tipo: string) {
  const alertas: Record<string, string> = {
    overdue_loan: "Préstamo vencido",
    released_pending_return: "Pendiente de devolución",
    executed_pending_sale: "Pendiente de venta",
  };

  return alertas[tipo] || tipo;
}

function Resumen({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-600">{titulo}</p>
      <p className="mt-2 text-2xl font-bold text-blue-900">{valor}</p>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">{titulo}</p>
      <p className="mt-1 font-medium text-gray-900">{valor}</p>
    </div>
  );
}
