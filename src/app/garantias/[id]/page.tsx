"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase";

type Moneda = {
  code: string;
  symbol: string;
};

type Cliente = {
  first_name: string;
  last_name: string;
  phone_primary: string | null;
  document_number: string | null;
};

type Prestamo = {
  loan_number: string;
  loan_type: string;
  principal_amount: number;
  principal_balance: number;
  interest_balance: number;
  late_fee_balance: number;
  interest_rate: number;
  interest_frequency: string;
  start_date: string;
  due_date: string | null;
  status: string;
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
  released_at: string | null;
  returned_at: string | null;
  executed_at: string | null;
  expediente_closed_at: string | null;
  notes: string | null;
  clients: Cliente | null;
  loans: Prestamo | null;
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
  received_by_name: string | null;
  receiver_document: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

type Archivo = {
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

type VentaGarantia = {
  id: string;
  sale_number: string;
  sale_date: string;
  buyer_name: string;
  buyer_document: string | null;
  buyer_phone: string | null;
  gross_sale_amount: number;
  legal_expenses: number;
  storage_expenses: number;
  repair_expenses: number;
  other_expenses: number;
  total_expenses: number;
  net_sale_amount: number;
  debt_before_sale: number;
  amount_applied_to_loan: number;
  remaining_amount: number;
  payment_method: string;
  reference_number: string | null;
  affects_cash: boolean;
  notes: string | null;
  status: string;
};

type Pestana =
  | "informacion"
  | "fotografias"
  | "documentos"
  | "historial";

export default function ExpedienteGarantiaPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);

  const [garantia, setGarantia] = useState<Garantia | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [venta, setVenta] = useState<VentaGarantia | null>(null);
  const [pestana, setPestana] = useState<Pestana>("informacion");
  const [cargando, setCargando] = useState(true);
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
  const [mostrarVenta, setMostrarVenta] = useState(false);
  const [compradorNombre, setCompradorNombre] = useState("");
  const [compradorDocumento, setCompradorDocumento] = useState("");
  const [compradorTelefono, setCompradorTelefono] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [gastoLegal, setGastoLegal] = useState("");
  const [gastoAlmacenamiento, setGastoAlmacenamiento] = useState("");
  const [gastoReparacion, setGastoReparacion] = useState("");
  const [otrosGastos, setOtrosGastos] = useState("");
  const [metodoPagoVenta, setMetodoPagoVenta] = useState("transfer");
  const [referenciaVenta, setReferenciaVenta] = useState("");
  const [ventaAfectaCaja, setVentaAfectaCaja] = useState(false);
  const [notasVenta, setNotasVenta] = useState("");
  const [guardandoVenta, setGuardandoVenta] = useState(false);

  useEffect(() => {
    async function cargarExpediente() {
      if (!params.id) return;

      setCargando(true);
      setError("");

      const [
        garantiaResultado,
        eventosResultado,
        archivosResultado,
        ventaResultado,
      ] = await Promise.all([
          supabase
            .from("loan_collaterals")
            .select(
              "id, collateral_type, description, brand, model, manufacture_year, serial_number, registration_number, plate_number, chassis_number, title_number, estimated_value, accepted_value, physical_condition, storage_location, received_date, collateral_status, released_at, returned_at, executed_at, expediente_closed_at, notes, clients(first_name, last_name, phone_primary, document_number), loans(loan_number, loan_type, principal_amount, principal_balance, interest_balance, late_fee_balance, interest_rate, interest_frequency, start_date, due_date, status, currencies(code, symbol))",
            )
            .eq("id", params.id)
            .single(),

          supabase
            .from("collateral_events")
            .select(
              "id, event_type, previous_status, new_status, previous_location, new_location, previous_condition, new_condition, received_by_name, receiver_document, reason, notes, created_at",
            )
            .eq("collateral_id", params.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("collateral_files")
            .select(
              "id, file_category, document_type, file_name, storage_path, mime_type, file_size_bytes, description, uploaded_at",
            )
            .eq("collateral_id", params.id)
            .eq("is_active", true)
            .order("uploaded_at", { ascending: false }),

          supabase
            .from("collateral_sales")
            .select(
              "id, sale_number, sale_date, buyer_name, buyer_document, buyer_phone, gross_sale_amount, legal_expenses, storage_expenses, repair_expenses, other_expenses, total_expenses, net_sale_amount, debt_before_sale, amount_applied_to_loan, remaining_amount, payment_method, reference_number, affects_cash, notes, status",
            )
            .eq("collateral_id", params.id)
            .eq("status", "posted")
            .order("sale_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (garantiaResultado.error) {
        setError(
          "No se pudo cargar la garantía: " +
            garantiaResultado.error.message,
        );
        setCargando(false);
        return;
      }

      if (eventosResultado.error) {
        setError(
          "No se pudo cargar el historial: " +
            eventosResultado.error.message,
        );
      }

      if (archivosResultado.error) {
        setError(
          "No se pudieron cargar los archivos: " +
            archivosResultado.error.message,
        );
      }

      const filas = (archivosResultado.data || []) as Omit<
        Archivo,
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

      setGarantia(
        garantiaResultado.data as unknown as Garantia,
      );
      setEventos((eventosResultado.data || []) as Evento[]);
      setArchivos(archivosConUrl);
      setVenta(
        ventaResultado.data
          ? (ventaResultado.data as VentaGarantia)
          : null,
      );
      setCargando(false);
    }

    void cargarExpediente();
  }, [params.id, supabase]);

  async function recargarExpediente() {
    if (!params.id) return;

    const [garantiaResultado, eventosResultado, ventaResultado] =
      await Promise.all([
      supabase
        .from("loan_collaterals")
        .select(
          "id, collateral_type, description, brand, model, manufacture_year, serial_number, registration_number, plate_number, chassis_number, title_number, estimated_value, accepted_value, physical_condition, storage_location, received_date, collateral_status, released_at, returned_at, executed_at, expediente_closed_at, notes, clients(first_name, last_name, phone_primary, document_number), loans(loan_number, loan_type, principal_amount, principal_balance, interest_balance, late_fee_balance, interest_rate, interest_frequency, start_date, due_date, status, currencies(code, symbol))",
        )
        .eq("id", params.id)
        .single(),

      supabase
        .from("collateral_events")
        .select(
          "id, event_type, previous_status, new_status, previous_location, new_location, previous_condition, new_condition, received_by_name, receiver_document, reason, notes, created_at",
        )
        .eq("collateral_id", params.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("collateral_sales")
        .select(
          "id, sale_number, sale_date, buyer_name, buyer_document, buyer_phone, gross_sale_amount, legal_expenses, storage_expenses, repair_expenses, other_expenses, total_expenses, net_sale_amount, debt_before_sale, amount_applied_to_loan, remaining_amount, payment_method, reference_number, affects_cash, notes, status",
        )
        .eq("collateral_id", params.id)
        .eq("status", "posted")
        .order("sale_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (garantiaResultado.error) {
      setError(
        "No se pudo actualizar la garantía: " +
          garantiaResultado.error.message,
      );
      return;
    }

    setGarantia(garantiaResultado.data as unknown as Garantia);
    setEventos((eventosResultado.data || []) as Evento[]);
    setVenta(
      ventaResultado.data
        ? (ventaResultado.data as VentaGarantia)
        : null,
    );
  }

  function abrirAccion(
    tipoAccion: "ubicacion" | "condicion" | "devolver" | "ejecutar",
  ) {
    if (!garantia) return;

    setAccion(tipoAccion);
    setError("");
    setExito("");
    setMotivo("");
    setNotasAccion("");
    setNuevoValor(
      tipoAccion === "ubicacion"
        ? garantia.storage_location || ""
        : tipoAccion === "condicion"
          ? garantia.physical_condition || ""
          : "",
    );

    setTipoReceptor("holder");
    setRecibidoPor(
      tipoAccion === "devolver" && garantia.clients
        ? `${garantia.clients.first_name} ${garantia.clients.last_name}`
        : "",
    );
    setDocumentoReceptor(
      tipoAccion === "devolver"
        ? garantia.clients?.document_number || ""
        : "",
    );
    setTelefonoReceptor(
      tipoAccion === "devolver"
        ? garantia.clients?.phone_primary || ""
        : "",
    );
    setRelacionReceptor("");
    setCondicionEntrega(garantia.physical_condition || "");
    setEntregaConfirmada(false);
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
    setCondicionEntrega("");
    setEntregaConfirmada(false);
  }

  async function guardarAccion() {
    if (!garantia || !accion) return;

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
      p_collateral_id: garantia.id,
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
    } else {
      nombreFuncion = "execute_loan_collateral";
      parametros = {
        ...parametros,
        p_reason: motivo.trim(),
        p_notes: notasAccion.trim() || null,
      };
    }

    const resultado = await supabase.rpc(
      nombreFuncion,
      parametros,
    );

    if (resultado.error) {
      setError(
        "No se pudo completar la acción: " +
          resultado.error.message,
      );
      setGuardandoAccion(false);
      return;
    }

    const mensajes: Record<string, string> = {
      ubicacion: "Ubicación actualizada correctamente.",
      condicion: "Condición física actualizada correctamente.",
      devolver: "Garantía devuelta correctamente.",
      ejecutar: "Garantía ejecutada correctamente.",
    };

    setExito(mensajes[accion]);
    cancelarAccion();
    await recargarExpediente();
    setGuardandoAccion(false);
  }

  function limpiarVenta() {
    if (guardandoVenta) return;

    setMostrarVenta(false);
    setCompradorNombre("");
    setCompradorDocumento("");
    setCompradorTelefono("");
    setPrecioVenta("");
    setGastoLegal("");
    setGastoAlmacenamiento("");
    setGastoReparacion("");
    setOtrosGastos("");
    setMetodoPagoVenta("transfer");
    setReferenciaVenta("");
    setVentaAfectaCaja(false);
    setNotasVenta("");
  }

  async function registrarVentaGarantia() {
    if (!garantia) return;

    const precio = Number(precioVenta);
    const legal = Number(gastoLegal || 0);
    const almacenamiento = Number(gastoAlmacenamiento || 0);
    const reparacion = Number(gastoReparacion || 0);
    const otros = Number(otrosGastos || 0);

    if (!Number.isFinite(precio) || precio <= 0) {
      setError("El precio de venta debe ser mayor que cero.");
      return;
    }

    if (compradorNombre.trim() === "") {
      setError("Debes indicar el nombre del comprador.");
      return;
    }

    if (
      [legal, almacenamiento, reparacion, otros].some(
        (valor) => !Number.isFinite(valor) || valor < 0,
      )
    ) {
      setError("Los gastos no pueden ser negativos.");
      return;
    }

    if (legal + almacenamiento + reparacion + otros > precio) {
      setError(
        "Los gastos no pueden superar el precio de venta.",
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas la venta de esta garantía por ${formatearMonto(
        precio,
        garantia.loans?.currencies || null,
      )}?`,
    );

    if (!confirmar) return;

    setGuardandoVenta(true);
    setError("");
    setExito("");

    const resultado = await supabase.rpc(
      "sell_executed_collateral",
      {
        p_collateral_id: garantia.id,
        p_gross_sale_amount: precio,
        p_buyer_name: compradorNombre.trim(),
        p_buyer_document:
          compradorDocumento.trim() || null,
        p_buyer_phone: compradorTelefono.trim() || null,
        p_legal_expenses: legal,
        p_storage_expenses: almacenamiento,
        p_repair_expenses: reparacion,
        p_other_expenses: otros,
        p_payment_method: metodoPagoVenta,
        p_reference_number:
          referenciaVenta.trim() || null,
        p_affects_cash: ventaAfectaCaja,
        p_notes: notasVenta.trim() || null,
      },
    );

    if (resultado.error) {
      setError(
        "No se pudo registrar la venta: " +
          resultado.error.message,
      );
      setGuardandoVenta(false);
      return;
    }

    const fila = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    setExito(
      `Venta ${fila?.sale_number || ""} registrada. ` +
        `Aplicado al préstamo: ${formatearMonto(
          Number(fila?.amount_applied_to_loan || 0),
          garantia.loans?.currencies || null,
        )}. ` +
        `Remanente: ${formatearMonto(
          Number(fila?.remaining_amount || 0),
          garantia.loans?.currencies || null,
        )}.`,
    );

    limpiarVenta();
    await recargarExpediente();
    setGuardandoVenta(false);
  }

  function imprimirReciboVenta() {
    if (!garantia || !venta) return;

    const ventana = window.open(
      "",
      "_blank",
      "width=850,height=950",
    );

    if (!ventana) {
      window.alert(
        "El navegador bloqueó la ventana de impresión.",
      );
      return;
    }

    const moneda = garantia.loans?.currencies || null;

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${venta.sale_number}</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              padding: 28px;
            }
            .recibo { max-width: 760px; margin: 0 auto; }
            h1, h2 { text-align: center; margin: 0; }
            h2 { margin-top: 6px; font-size: 17px; }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-top: 24px;
            }
            .dato {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 12px;
            }
            .etiqueta {
              color: #6b7280;
              font-size: 11px;
              text-transform: uppercase;
            }
            .valor { margin-top: 4px; font-weight: bold; }
            .totales {
              margin-top: 24px;
              border: 2px solid #1e3a8a;
              border-radius: 10px;
              padding: 16px;
            }
            .fila {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              margin: 8px 0;
            }
            .firmas {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 50px;
              margin-top: 70px;
            }
            .firma {
              border-top: 1px solid #111827;
              padding-top: 8px;
              text-align: center;
            }
            @page { size: letter; margin: 12mm; }
          </style>
        </head>
        <body>
          <div class="recibo">
            <h1>MattFinance ERP</h1>
            <h2>RECIBO DE VENTA DE GARANTÍA</h2>

            <div class="grid">
              ${datoImpresion("Venta", venta.sale_number)}
              ${datoImpresion(
                "Fecha",
                formatearFechaHora(venta.sale_date),
              )}
              ${datoImpresion("Comprador", venta.buyer_name)}
              ${datoImpresion(
                "Documento",
                venta.buyer_document || "—",
              )}
              ${datoImpresion(
                "Teléfono",
                venta.buyer_phone || "—",
              )}
              ${datoImpresion(
                "Método de pago",
                textoMetodoPago(venta.payment_method),
              )}
              ${datoImpresion(
                "Referencia",
                venta.reference_number || "—",
              )}
              ${datoImpresion(
                "Préstamo",
                garantia.loans?.loan_number || "—",
              )}
              ${datoImpresion(
                "Cliente original",
                nombreCliente(garantia),
              )}
              ${datoImpresion(
                "Garantía",
                garantia.description,
              )}
            </div>

            <div class="totales">
              <div class="fila">
                <strong>Precio bruto</strong>
                <span>${formatearMonto(
                  venta.gross_sale_amount,
                  moneda,
                )}</span>
              </div>
              <div class="fila">
                <span>Gastos legales</span>
                <span>${formatearMonto(
                  venta.legal_expenses,
                  moneda,
                )}</span>
              </div>
              <div class="fila">
                <span>Almacenamiento</span>
                <span>${formatearMonto(
                  venta.storage_expenses,
                  moneda,
                )}</span>
              </div>
              <div class="fila">
                <span>Reparación</span>
                <span>${formatearMonto(
                  venta.repair_expenses,
                  moneda,
                )}</span>
              </div>
              <div class="fila">
                <span>Otros gastos</span>
                <span>${formatearMonto(
                  venta.other_expenses,
                  moneda,
                )}</span>
              </div>
              <hr />
              <div class="fila">
                <strong>Ingreso neto</strong>
                <strong>${formatearMonto(
                  venta.net_sale_amount,
                  moneda,
                )}</strong>
              </div>
              <div class="fila">
                <span>Aplicado al préstamo</span>
                <span>${formatearMonto(
                  venta.amount_applied_to_loan,
                  moneda,
                )}</span>
              </div>
              <div class="fila">
                <span>Remanente</span>
                <span>${formatearMonto(
                  venta.remaining_amount,
                  moneda,
                )}</span>
              </div>
            </div>

            <p><strong>Observaciones:</strong> ${
              venta.notes || "Ninguna"
            }</p>

            <div class="firmas">
              <div class="firma">Comprador</div>
              <div class="firma">Representante MattFinance</div>
            </div>
          </div>
        </body>
      </html>
    `);

    ventana.document.close();
    ventana.focus();
    ventana.onload = () => ventana.print();
  }

  function imprimirContratoGarantia() {
    if (!garantia) return;

    const ventana = window.open(
      "",
      "_blank",
      "width=900,height=1000",
    );

    if (!ventana) {
      window.alert(
        "El navegador bloqueó la ventana de impresión.",
      );
      return;
    }

    const moneda = garantia.loans?.currencies || null;
    const balance = totalPendiente(garantia.loans);

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Contrato de garantía</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              line-height: 1.55;
            }
            .documento {
              max-width: 850px;
              margin: 0 auto;
            }
            h1, h2 {
              text-align: center;
              margin: 0;
            }
            h1 {
              font-size: 24px;
            }
            h2 {
              margin-top: 6px;
              font-size: 17px;
            }
            .subtitulo {
              margin-top: 6px;
              text-align: center;
              color: #4b5563;
            }
            .bloque {
              margin-top: 22px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 16px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .dato {
              border-bottom: 1px solid #e5e7eb;
              padding: 8px 0;
            }
            .etiqueta {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
            }
            .valor {
              margin-top: 3px;
              font-weight: bold;
            }
            .clausula {
              margin-top: 18px;
              text-align: justify;
            }
            .firmas {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 40px;
              margin-top: 70px;
            }
            .firma {
              text-align: center;
              border-top: 1px solid #111827;
              padding-top: 8px;
            }
            .pie {
              margin-top: 35px;
              font-size: 11px;
              color: #6b7280;
              text-align: center;
            }
            @page {
              size: letter;
              margin: 12mm;
            }
          </style>
        </head>
        <body>
          <div class="documento">
            <h1>MattFinance ERP</h1>
            <h2>CONTRATO DE ENTREGA DE GARANTÍA</h2>
            <p class="subtitulo">
              Préstamo ${garantia.loans?.loan_number || "—"}
            </p>

            <div class="bloque">
              <div class="grid">
                ${datoImpresion("Cliente", nombreCliente(garantia))}
                ${datoImpresion(
                  "Documento",
                  garantia.clients?.document_number || "—",
                )}
                ${datoImpresion(
                  "Teléfono",
                  garantia.clients?.phone_primary || "—",
                )}
                ${datoImpresion(
                  "Fecha de recepción",
                  formatearFecha(garantia.received_date),
                )}
                ${datoImpresion(
                  "Monto original del préstamo",
                  formatearMonto(
                    Number(garantia.loans?.principal_amount || 0),
                    moneda,
                  ),
                )}
                ${datoImpresion(
                  "Balance actual",
                  formatearMonto(balance, moneda),
                )}
                ${datoImpresion(
                  "Frecuencia de pago",
                  textoFrecuencia(
                    garantia.loans?.interest_frequency || "",
                  ),
                )}
                ${datoImpresion(
                  "Estado del préstamo",
                  textoEstadoPrestamo(garantia.loans?.status || ""),
                )}
              </div>
            </div>

            <div class="bloque">
              <div class="grid">
                ${datoImpresion(
                  "Tipo de garantía",
                  textoTipo(garantia.collateral_type),
                )}
                ${datoImpresion(
                  "Descripción",
                  garantia.description,
                )}
                ${datoImpresion(
                  "Marca y modelo",
                  [garantia.brand, garantia.model]
                    .filter(Boolean)
                    .join(" ") || "—",
                )}
                ${datoImpresion(
                  "Año",
                  garantia.manufacture_year
                    ? String(garantia.manufacture_year)
                    : "—",
                )}
                ${datoImpresion(
                  "Serie",
                  garantia.serial_number || "—",
                )}
                ${datoImpresion(
                  "Matrícula",
                  garantia.registration_number || "—",
                )}
                ${datoImpresion(
                  "Placa",
                  garantia.plate_number || "—",
                )}
                ${datoImpresion(
                  "Chasis",
                  garantia.chassis_number || "—",
                )}
                ${datoImpresion(
                  "Título",
                  garantia.title_number || "—",
                )}
                ${datoImpresion(
                  "Condición física",
                  garantia.physical_condition || "—",
                )}
                ${datoImpresion(
                  "Valor estimado",
                  formatearMonto(
                    Number(garantia.estimated_value || 0),
                    moneda,
                  ),
                )}
                ${datoImpresion(
                  "Valor aceptado",
                  formatearMonto(
                    Number(garantia.accepted_value || 0),
                    moneda,
                  ),
                )}
              </div>
            </div>

            <p class="clausula">
              El cliente declara que entrega voluntariamente el bien descrito
              anteriormente como garantía del préstamo identificado en este
              documento. Declara además que la información suministrada es
              verdadera y que posee la facultad legal para entregar dicho bien.
            </p>

            <p class="clausula">
              La garantía permanecerá bajo resguardo mientras exista capital,
              interés, mora u otra obligación pendiente relacionada con el
              préstamo. Cuando la deuda quede totalmente saldada, la garantía
              será marcada como liberada y podrá ser devuelta mediante el
              proceso formal de entrega y recepción.
            </p>

            <p class="clausula">
              En caso de incumplimiento, el tratamiento de la garantía se
              realizará conforme a los acuerdos firmados, la documentación
              aplicable y las disposiciones legales correspondientes. Este
              documento no sustituye asesoría legal ni contratos notariales
              que pudieran ser requeridos según el tipo de bien.
            </p>

            <p class="clausula">
              Observaciones de la garantía:
              <strong>${garantia.notes || "Ninguna"}</strong>
            </p>

            <div class="firmas">
              <div class="firma">
                Firma del cliente<br />
                ${nombreCliente(garantia)}
              </div>
              <div class="firma">
                Firma del representante<br />
                MattFinance
              </div>
            </div>

            <div class="firmas">
              <div class="firma">
                Número de documento
              </div>
              <div class="firma">
                Fecha de firma
              </div>
            </div>

            <p class="pie">
              Documento generado desde MattFinance ERP el
              ${new Date().toLocaleString("es-DO")}.
            </p>
          </div>
        </body>
      </html>
    `);

    ventana.document.close();
    ventana.focus();
    ventana.onload = () => ventana.print();
  }

  function imprimirExpediente() {
    if (!garantia) return;

    const ventana = window.open(
      "",
      "_blank",
      "width=1200,height=950",
    );

    if (!ventana) {
      window.alert(
        "El navegador bloqueó la ventana de impresión.",
      );
      return;
    }

    const moneda = garantia.loans?.currencies || null;
    const fotos = archivos.filter(
      (archivo) => archivo.file_category === "photo",
    );
    const documentos = archivos.filter(
      (archivo) => archivo.file_category === "document",
    );

    const filasEventos = eventos
      .map(
        (evento) => `
          <tr>
            <td>${formatearFechaHora(evento.created_at)}</td>
            <td>${textoEvento(evento.event_type)}</td>
            <td>${descripcionEvento(evento)}</td>
            <td>${evento.reason || "—"}</td>
            <td>${evento.received_by_name || "—"}</td>
            <td>${evento.notes || "—"}</td>
          </tr>
        `,
      )
      .join("");

    const tarjetasFotos = fotos
      .map(
        (foto) => `
          <div class="foto">
            ${
              foto.signed_url
                ? `<img src="${foto.signed_url}" alt="${escaparHtml(
                    foto.description || foto.file_name,
                  )}" />`
                : `<div class="sin-imagen">Vista previa no disponible</div>`
            }
            <div class="foto-info">
              <strong>${textoTipoArchivo(foto.document_type)}</strong>
              <span>${escaparHtml(
                foto.description || foto.file_name,
              )}</span>
              <small>${formatearFechaHora(foto.uploaded_at)}</small>
            </div>
          </div>
        `,
      )
      .join("");

    const filasDocumentos = documentos
      .map(
        (documento) => `
          <tr>
            <td>${textoTipoArchivo(documento.document_type)}</td>
            <td>${escaparHtml(documento.file_name)}</td>
            <td>${escaparHtml(documento.description || "—")}</td>
            <td>${formatearTamano(documento.file_size_bytes)}</td>
            <td>${formatearFechaHora(documento.uploaded_at)}</td>
          </tr>
        `,
      )
      .join("");

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Expediente ${garantia.loans?.loan_number || ""}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              line-height: 1.4;
              counter-reset: page;
            }
            .reporte {
              max-width: 1100px;
              margin: 0 auto;
            }
            h1, h2 {
              text-align: center;
              margin: 0;
            }
            h1 { font-size: 25px; }
            h2 {
              margin-top: 5px;
              font-size: 17px;
            }
            h3 {
              margin-top: 26px;
              margin-bottom: 10px;
              padding-bottom: 6px;
              border-bottom: 2px solid #1e3a8a;
              color: #1e3a8a;
            }
            .meta {
              margin-top: 10px;
              text-align: center;
              color: #4b5563;
              font-size: 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-top: 22px;
            }
            .dato {
              border: 1px solid #d1d5db;
              border-radius: 7px;
              padding: 10px;
              break-inside: avoid;
            }
            .etiqueta {
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
            }
            .valor {
              margin-top: 4px;
              font-weight: bold;
              overflow-wrap: anywhere;
            }
            .observaciones {
              border: 1px solid #d1d5db;
              border-radius: 7px;
              padding: 12px;
              white-space: pre-wrap;
            }
            .galeria {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
            }
            .foto {
              border: 1px solid #d1d5db;
              border-radius: 7px;
              overflow: hidden;
              break-inside: avoid;
            }
            .foto img,
            .sin-imagen {
              width: 100%;
              height: 180px;
              object-fit: cover;
              background: #f1f5f9;
            }
            .sin-imagen {
              display: flex;
              align-items: center;
              justify-content: center;
              color: #6b7280;
              font-size: 11px;
            }
            .foto-info {
              display: flex;
              flex-direction: column;
              gap: 4px;
              padding: 8px;
              font-size: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 6px;
              text-align: left;
              vertical-align: top;
              overflow-wrap: anywhere;
            }
            th { background: #f1f5f9; }
            tr { break-inside: avoid; }
            .vacio {
              color: #6b7280;
              font-style: italic;
            }
            .firmas {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 50px;
              margin-top: 60px;
              break-inside: avoid;
            }
            .firma {
              border-top: 1px solid #111827;
              padding-top: 8px;
              text-align: center;
              font-size: 11px;
            }
            .pie {
              margin-top: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 10px;
            }
            @media print {
              .salto-pagina {
                break-before: page;
              }
            }
            @page {
              size: landscape;
              margin: 10mm;
            }
          </style>
        </head>
        <body>
          <div class="reporte">
            <h1>MattFinance ERP</h1>
            <h2>EXPEDIENTE COMPLETO DE GARANTÍA</h2>
            <p class="meta">
              Préstamo ${garantia.loans?.loan_number || "—"} ·
              Generado el ${new Date().toLocaleString("es-DO")}
            </p>

            <h3>Resumen</h3>
            <div class="grid">
              ${datoImpresion("Cliente", nombreCliente(garantia))}
              ${datoImpresion(
                "Documento",
                garantia.clients?.document_number || "—",
              )}
              ${datoImpresion(
                "Teléfono",
                garantia.clients?.phone_primary || "—",
              )}
              ${datoImpresion(
                "Préstamo",
                garantia.loans?.loan_number || "—",
              )}
              ${datoImpresion(
                "Estado del préstamo",
                textoEstadoPrestamo(garantia.loans?.status || ""),
              )}
              ${datoImpresion(
                "Frecuencia",
                textoFrecuencia(
                  garantia.loans?.interest_frequency || "",
                ),
              )}
              ${datoImpresion(
                "Estado de la garantía",
                textoEstado(garantia.collateral_status),
              )}
              ${datoImpresion(
                "Tipo de garantía",
                textoTipo(garantia.collateral_type),
              )}
              ${datoImpresion(
                "Fecha de recepción",
                formatearFecha(garantia.received_date),
              )}
              ${datoImpresion(
                "Ubicación",
                garantia.storage_location || "—",
              )}
              ${datoImpresion(
                "Valor estimado",
                formatearMonto(
                  Number(garantia.estimated_value || 0),
                  moneda,
                ),
              )}
              ${datoImpresion(
                "Valor aceptado",
                formatearMonto(
                  Number(garantia.accepted_value || 0),
                  moneda,
                ),
              )}
              ${datoImpresion(
                "Capital pendiente",
                formatearMonto(
                  Number(garantia.loans?.principal_balance || 0),
                  moneda,
                ),
              )}
              ${datoImpresion(
                "Interés pendiente",
                formatearMonto(
                  Number(garantia.loans?.interest_balance || 0),
                  moneda,
                ),
              )}
              ${datoImpresion(
                "Mora pendiente",
                formatearMonto(
                  Number(garantia.loans?.late_fee_balance || 0),
                  moneda,
                ),
              )}
            </div>

            <h3>Información del bien</h3>
            <div class="grid">
              ${datoImpresion("Descripción", garantia.description)}
              ${datoImpresion(
                "Marca y modelo",
                [garantia.brand, garantia.model]
                  .filter(Boolean)
                  .join(" ") || "—",
              )}
              ${datoImpresion(
                "Año",
                garantia.manufacture_year
                  ? String(garantia.manufacture_year)
                  : "—",
              )}
              ${datoImpresion(
                "Serie",
                garantia.serial_number || "—",
              )}
              ${datoImpresion(
                "Matrícula",
                garantia.registration_number || "—",
              )}
              ${datoImpresion(
                "Placa",
                garantia.plate_number || "—",
              )}
              ${datoImpresion(
                "Chasis",
                garantia.chassis_number || "—",
              )}
              ${datoImpresion(
                "Título",
                garantia.title_number || "—",
              )}
              ${datoImpresion(
                "Condición física",
                garantia.physical_condition || "—",
              )}
              ${datoImpresion(
                "Expediente",
                garantia.expediente_closed_at
                  ? `Cerrado el ${formatearFechaHora(
                      garantia.expediente_closed_at,
                    )}`
                  : "Abierto",
              )}
            </div>

            <h3>Observaciones</h3>
            <div class="observaciones">
              ${escaparHtml(garantia.notes || "Ninguna")}
            </div>

            <h3 class="salto-pagina">Fotografías (${fotos.length})</h3>
            ${
              fotos.length > 0
                ? `<div class="galeria">${tarjetasFotos}</div>`
                : `<p class="vacio">No hay fotografías registradas.</p>`
            }

            <h3 class="salto-pagina">Documentos (${documentos.length})</h3>
            ${
              documentos.length > 0
                ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Archivo</th>
                        <th>Descripción</th>
                        <th>Tamaño</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>${filasDocumentos}</tbody>
                  </table>
                `
                : `<p class="vacio">No hay documentos registrados.</p>`
            }

            <h3 class="salto-pagina">Historial (${eventos.length})</h3>
            ${
              eventos.length > 0
                ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Evento</th>
                        <th>Detalle</th>
                        <th>Motivo</th>
                        <th>Recibido por</th>
                        <th>Nota</th>
                      </tr>
                    </thead>
                    <tbody>${filasEventos}</tbody>
                  </table>
                `
                : `<p class="vacio">No hay eventos registrados.</p>`
            }

            <div class="firmas">
              <div class="firma">
                Responsable de revisión
              </div>
              <div class="firma">
                Firma y sello
              </div>
            </div>

            <p class="pie">
              Expediente generado automáticamente por MattFinance ERP.
            </p>
          </div>
        </body>
      </html>
    `);

    ventana.document.close();
    ventana.focus();

    ventana.onload = () => {
      setTimeout(() => ventana.print(), 350);
    };
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-center text-gray-500">
          Cargando expediente...
        </p>
      </main>
    );
  }

  if (!garantia) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow">
          <p className="text-red-700">
            {error || "No se encontró la garantía."}
          </p>
          <Link
            href="/garantias"
            className="mt-5 inline-flex rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white"
          >
            Volver a Garantías
          </Link>
        </div>
      </main>
    );
  }

  const fotos = archivos.filter(
    (archivo) => archivo.file_category === "photo",
  );
  const documentos = archivos.filter(
    (archivo) => archivo.file_category === "document",
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/garantias"
              className="text-sm font-semibold text-blue-800 hover:underline"
            >
              ← Volver a Garantías
            </Link>
            <h1 className="mt-3 text-4xl font-bold text-blue-900">
              Expediente de garantía
            </h1>
            <p className="mt-2 text-gray-600">
              {textoTipo(garantia.collateral_type)} ·{" "}
              {garantia.loans?.loan_number || "Sin préstamo"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {venta && (
              <button
                type="button"
                onClick={imprimirReciboVenta}
                className="rounded-lg border border-green-300 bg-white px-5 py-3 font-semibold text-green-800 hover:bg-green-50"
              >
                Imprimir recibo de venta
              </button>
            )}

            <button
              type="button"
              onClick={imprimirContratoGarantia}
              className="rounded-lg border border-blue-300 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
            >
              Imprimir contrato
            </button>

            <button
              type="button"
              onClick={imprimirExpediente}
              className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Imprimir expediente
            </button>
          </div>
        </div>

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

        {garantia.collateral_status === "executed" && (
          <section className="mt-8 rounded-2xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-red-900">
                  Garantía ejecutada
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ya puedes registrar su venta y aplicar el ingreso neto al préstamo.
                </p>
              </div>

              {!mostrarVenta && (
                <button
                  type="button"
                  onClick={() => {
                    setMostrarVenta(true);
                    setError("");
                    setExito("");
                  }}
                  className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                >
                  Vender garantía
                </button>
              )}
            </div>
          </section>
        )}

        {mostrarVenta && garantia.collateral_status === "executed" && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-red-900">
              Registrar venta de garantía
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <CampoAccion
                etiqueta="Nombre del comprador"
                valor={compradorNombre}
                cambiar={setCompradorNombre}
              />
              <CampoAccion
                etiqueta="Documento del comprador"
                valor={compradorDocumento}
                cambiar={setCompradorDocumento}
                placeholder="Opcional"
              />
              <CampoAccion
                etiqueta="Teléfono del comprador"
                valor={compradorTelefono}
                cambiar={setCompradorTelefono}
                placeholder="Opcional"
              />
              <CampoAccion
                etiqueta="Precio bruto de venta"
                valor={precioVenta}
                cambiar={setPrecioVenta}
                placeholder="0.00"
              />
              <CampoAccion
                etiqueta="Gastos legales"
                valor={gastoLegal}
                cambiar={setGastoLegal}
                placeholder="0.00"
              />
              <CampoAccion
                etiqueta="Gastos de almacenamiento"
                valor={gastoAlmacenamiento}
                cambiar={setGastoAlmacenamiento}
                placeholder="0.00"
              />
              <CampoAccion
                etiqueta="Gastos de reparación"
                valor={gastoReparacion}
                cambiar={setGastoReparacion}
                placeholder="0.00"
              />
              <CampoAccion
                etiqueta="Otros gastos"
                valor={otrosGastos}
                cambiar={setOtrosGastos}
                placeholder="0.00"
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Método de pago
                </label>
                <select
                  value={metodoPagoVenta}
                  onChange={(event) =>
                    setMetodoPagoVenta(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3"
                >
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                  <option value="check">Cheque</option>
                  <option value="deposit">Depósito</option>
                </select>
              </div>

              <CampoAccion
                etiqueta="Referencia"
                valor={referenciaVenta}
                cambiar={setReferenciaVenta}
                placeholder="Opcional"
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  value={notasVenta}
                  onChange={(event) =>
                    setNotasVenta(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-red-700"
                />
              </div>

              <label className="md:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-300 bg-white p-4">
                <input
                  type="checkbox"
                  checked={ventaAfectaCaja}
                  onChange={(event) =>
                    setVentaAfectaCaja(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-gray-700">
                  Registrar en Caja cuando el dinero realmente entre a la caja del negocio.
                </span>
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-white p-4 text-sm text-gray-700">
              <p>
                <strong>Deuda actual:</strong>{" "}
                {formatearMonto(
                  totalPendiente(garantia.loans),
                  garantia.loans?.currencies || null,
                )}
              </p>
              <p className="mt-1">
                El ingreso neto se aplicará por cuotas: mora, interés,
                capital y luego la siguiente cuota.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={limpiarVenta}
                disabled={guardandoVenta}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void registrarVentaGarantia()}
                disabled={guardandoVenta}
                className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {guardandoVenta
                  ? "Registrando..."
                  : "Confirmar venta"}
              </button>
            </div>
          </section>
        )}

        {!["returned", "executed", "sold", "cancelled"].includes(
          garantia.collateral_status,
        ) && (
          <section className="mt-8 rounded-2xl bg-white p-5 shadow">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => abrirAccion("ubicacion")}
                className="rounded-lg bg-blue-900 px-4 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Cambiar ubicación
              </button>
              <button
                type="button"
                onClick={() => abrirAccion("condicion")}
                className="rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-700"
              >
                Cambiar condición
              </button>
              <button
                type="button"
                onClick={() => abrirAccion("devolver")}
                className="rounded-lg bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800"
              >
                Devolver garantía
              </button>
              <button
                type="button"
                onClick={() => abrirAccion("ejecutar")}
                className="rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800"
              >
                Ejecutar garantía
              </button>
            </div>
          </section>
        )}

        {accion && (
          <section
            className={
              accion === "ejecutar"
                ? "mt-6 rounded-2xl border border-red-200 bg-red-50 p-6"
                : accion === "devolver"
                  ? "mt-6 rounded-2xl border border-green-200 bg-green-50 p-6"
                  : "mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6"
            }
          >
            <h2 className="text-xl font-bold text-blue-900">
              {accion === "ubicacion" && "Cambiar ubicación"}
              {accion === "condicion" && "Cambiar condición física"}
              {accion === "devolver" && "Devolver garantía"}
              {accion === "ejecutar" && "Ejecutar garantía"}
            </h2>

            {(accion === "ubicacion" || accion === "condicion") && (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
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
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  />
                </div>

                <CampoAccion
                  etiqueta="Motivo"
                  valor={motivo}
                  cambiar={setMotivo}
                  placeholder="Opcional"
                />
                <CampoAccion
                  etiqueta="Observaciones"
                  valor={notasAccion}
                  cambiar={setNotasAccion}
                  placeholder="Opcional"
                />
              </div>
            )}

            {accion === "devolver" && (
              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-green-200 bg-white p-4">
                  <p className="font-semibold text-green-900">
                    ¿Quién recibe la garantía?
                  </p>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
                      <input
                        type="radio"
                        checked={tipoReceptor === "holder"}
                        onChange={() => {
                          setTipoReceptor("holder");
                          setRecibidoPor(
                            garantia.clients
                              ? `${garantia.clients.first_name} ${garantia.clients.last_name}`
                              : "",
                          );
                          setDocumentoReceptor(
                            garantia.clients?.document_number || "",
                          );
                          setTelefonoReceptor(
                            garantia.clients?.phone_primary || "",
                          );
                          setRelacionReceptor("");
                        }}
                      />
                      Titular
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
                      <input
                        type="radio"
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
                  <CampoAccion
                    etiqueta="Nombre de quien recibe"
                    valor={recibidoPor}
                    cambiar={setRecibidoPor}
                  />
                  <CampoAccion
                    etiqueta="Documento"
                    valor={documentoReceptor}
                    cambiar={setDocumentoReceptor}
                    placeholder={
                      tipoReceptor === "authorized_person"
                        ? "Obligatorio"
                        : "Opcional"
                    }
                  />
                  <CampoAccion
                    etiqueta="Teléfono"
                    valor={telefonoReceptor}
                    cambiar={setTelefonoReceptor}
                    placeholder="Opcional"
                  />

                  {tipoReceptor === "authorized_person" && (
                    <CampoAccion
                      etiqueta="Relación con el cliente"
                      valor={relacionReceptor}
                      cambiar={setRelacionReceptor}
                      placeholder="Ejemplo: Madre, esposo, representante"
                    />
                  )}

                  <div className="md:col-span-2">
                    <CampoAccion
                      etiqueta="Condición al entregar"
                      valor={condicionEntrega}
                      cambiar={setCondicionEntrega}
                      placeholder="Ejemplo: Entregada en buen estado"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Observaciones
                    </label>
                    <textarea
                      rows={3}
                      value={notasAccion}
                      onChange={(event) =>
                        setNotasAccion(event.target.value)
                      }
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
                    persona indicada y que los datos son correctos.
                  </span>
                </label>
              </div>
            )}

            {accion === "ejecutar" && (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <CampoAccion
                  etiqueta="Motivo"
                  valor={motivo}
                  cambiar={setMotivo}
                  placeholder="Obligatorio"
                />
                <CampoAccion
                  etiqueta="Observaciones"
                  valor={notasAccion}
                  cambiar={setNotasAccion}
                  placeholder="Opcional"
                />
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
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

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Resumen
            titulo="Estado"
            valor={textoEstado(garantia.collateral_status)}
          />
          <Resumen
            titulo="Cliente"
            valor={nombreCliente(garantia)}
          />
          <Resumen
            titulo="Préstamo"
            valor={garantia.loans?.loan_number || "—"}
          />
          <Resumen
            titulo="Fecha recibida"
            valor={formatearFecha(garantia.received_date)}
          />
          <Resumen
            titulo="Tipo"
            valor={textoTipo(garantia.collateral_type)}
          />
          <Resumen
            titulo="Ubicación"
            valor={garantia.storage_location || "—"}
          />
          <Resumen
            titulo="Valor aceptado"
            valor={formatearMonto(
              Number(garantia.accepted_value || 0),
              garantia.loans?.currencies || null,
            )}
          />
          <Resumen
            titulo="Valor estimado"
            valor={formatearMonto(
              Number(garantia.estimated_value || 0),
              garantia.loans?.currencies || null,
            )}
          />
        </section>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-gray-300 pb-3">
          {(
            [
              ["informacion", "Información"],
              ["fotografias", `Fotografías (${fotos.length})`],
              ["documentos", `Documentos (${documentos.length})`],
              ["historial", `Historial (${eventos.length})`],
            ] as [Pestana, string][]
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setPestana(valor)}
              className={
                pestana === valor
                  ? "rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white"
                  : "rounded-lg bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
              }
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {pestana === "informacion" && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Información de la garantía
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Dato titulo="Descripción" valor={garantia.description} />
              <Dato
                titulo="Marca y modelo"
                valor={
                  [garantia.brand, garantia.model]
                    .filter(Boolean)
                    .join(" ") || "—"
                }
              />
              <Dato
                titulo="Año"
                valor={
                  garantia.manufacture_year
                    ? String(garantia.manufacture_year)
                    : "—"
                }
              />
              <Dato
                titulo="Serie"
                valor={garantia.serial_number || "—"}
              />
              <Dato
                titulo="Matrícula"
                valor={garantia.registration_number || "—"}
              />
              <Dato
                titulo="Placa"
                valor={garantia.plate_number || "—"}
              />
              <Dato
                titulo="Chasis"
                valor={garantia.chassis_number || "—"}
              />
              <Dato
                titulo="Título"
                valor={garantia.title_number || "—"}
              />
              <Dato
                titulo="Condición física"
                valor={garantia.physical_condition || "—"}
              />
              <Dato
                titulo="Capital pendiente"
                valor={formatearMonto(
                  Number(garantia.loans?.principal_balance || 0),
                  garantia.loans?.currencies || null,
                )}
              />
              <Dato
                titulo="Interés pendiente"
                valor={formatearMonto(
                  Number(garantia.loans?.interest_balance || 0),
                  garantia.loans?.currencies || null,
                )}
              />
              <Dato
                titulo="Mora pendiente"
                valor={formatearMonto(
                  Number(garantia.loans?.late_fee_balance || 0),
                  garantia.loans?.currencies || null,
                )}
              />
              <Dato
                titulo="Frecuencia"
                valor={textoFrecuencia(
                  garantia.loans?.interest_frequency || "",
                )}
              />
              <Dato
                titulo="Estado préstamo"
                valor={textoEstadoPrestamo(
                  garantia.loans?.status || "",
                )}
              />
              <Dato
                titulo="Expediente"
                valor={
                  garantia.expediente_closed_at
                    ? `Cerrado el ${formatearFechaHora(
                        garantia.expediente_closed_at,
                      )}`
                    : "Abierto"
                }
              />
            </div>

            {venta && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-green-900">
                      Venta registrada
                    </h3>
                    <p className="mt-1 text-sm text-green-800">
                      {venta.sale_number} ·{" "}
                      {formatearFechaHora(venta.sale_date)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={imprimirReciboVenta}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    Imprimir recibo
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Dato
                    titulo="Comprador"
                    valor={venta.buyer_name}
                  />
                  <Dato
                    titulo="Precio bruto"
                    valor={formatearMonto(
                      venta.gross_sale_amount,
                      garantia.loans?.currencies || null,
                    )}
                  />
                  <Dato
                    titulo="Gastos totales"
                    valor={formatearMonto(
                      venta.total_expenses,
                      garantia.loans?.currencies || null,
                    )}
                  />
                  <Dato
                    titulo="Ingreso neto"
                    valor={formatearMonto(
                      venta.net_sale_amount,
                      garantia.loans?.currencies || null,
                    )}
                  />
                  <Dato
                    titulo="Aplicado al préstamo"
                    valor={formatearMonto(
                      venta.amount_applied_to_loan,
                      garantia.loans?.currencies || null,
                    )}
                  />
                  <Dato
                    titulo="Remanente"
                    valor={formatearMonto(
                      venta.remaining_amount,
                      garantia.loans?.currencies || null,
                    )}
                  />
                  <Dato
                    titulo="Método de pago"
                    valor={textoMetodoPago(
                      venta.payment_method,
                    )}
                  />
                  <Dato
                    titulo="Referencia"
                    valor={venta.reference_number || "—"}
                  />
                </div>
              </div>
            )}

            {garantia.notes && (
              <div className="mt-6 rounded-xl bg-slate-50 p-5">
                <h3 className="font-bold text-blue-900">
                  Observaciones
                </h3>
                <p className="mt-2 text-gray-700">
                  {garantia.notes}
                </p>
              </div>
            )}
          </section>
        )}

        {pestana === "fotografias" && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Fotografías
            </h2>

            {fotos.length === 0 ? (
              <p className="mt-5 text-gray-500">
                No hay fotografías registradas.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fotos.map((foto) => (
                  <div
                    key={foto.id}
                    className="overflow-hidden rounded-xl border border-gray-200"
                  >
                    {foto.signed_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(foto.signed_url, "_blank")
                        }
                        className="block h-56 w-full bg-slate-100"
                      >
                        <img
                          src={foto.signed_url}
                          alt={foto.description || foto.file_name}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-slate-100 text-gray-500">
                        Vista previa no disponible
                      </div>
                    )}

                    <div className="p-4">
                      <p className="font-semibold text-gray-900">
                        {textoTipoArchivo(foto.document_type)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {foto.description || foto.file_name}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {formatearFechaHora(foto.uploaded_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {pestana === "documentos" && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Documentos
            </h2>

            {documentos.length === 0 ? (
              <p className="mt-5 text-gray-500">
                No hay documentos registrados.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Tipo",
                        "Archivo",
                        "Descripción",
                        "Tamaño",
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
                    {documentos.map((documento) => (
                      <tr key={documento.id}>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {textoTipoArchivo(
                            documento.document_type,
                          )}
                        </td>
                        <td className="max-w-xs break-all px-4 py-4 text-sm font-medium text-gray-900">
                          {documento.file_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {documento.description || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {formatearTamano(
                            documento.file_size_bytes,
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {formatearFechaHora(
                            documento.uploaded_at,
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={!documento.signed_url}
                            onClick={() =>
                              window.open(
                                documento.signed_url,
                                "_blank",
                              )
                            }
                            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {pestana === "historial" && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Historial
            </h2>

            {eventos.length === 0 ? (
              <p className="mt-5 text-gray-500">
                No hay eventos registrados.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {eventos.map((evento) => (
                  <div
                    key={evento.id}
                    className="rounded-xl border border-gray-200 bg-slate-50 p-4"
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
                        <strong>Motivo:</strong>{" "}
                        {evento.reason}
                      </p>
                    )}

                    {evento.received_by_name && (
                      <p className="mt-2 text-sm text-gray-700">
                        <strong>Recibido por:</strong>{" "}
                        {evento.received_by_name}
                      </p>
                    )}

                    {evento.notes && (
                      <p className="mt-2 text-sm text-gray-700">
                        <strong>Nota:</strong>{" "}
                        {evento.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
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

function formatearMonto(
  monto: number,
  moneda: Moneda | null = null,
) {
  return `${moneda?.symbol || "RD$"} ${Number(
    monto,
  ).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString(
    "es-DO",
  );
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

function textoEstadoPrestamo(estado: string) {
  const estados: Record<string, string> = {
    active: "Activo",
    overdue: "Vencido",
    paid: "Pagado",
    cancelled: "Cancelado",
  };

  return estados[estado] || estado || "—";
}

function textoMetodoPago(valor: string) {
  const metodos: Record<string, string> = {
    transfer: "Transferencia",
    cash: "Efectivo",
    check: "Cheque",
    deposit: "Depósito",
  };

  return metodos[valor] || valor || "—";
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

function escaparHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function datoImpresion(etiqueta: string, valor: string) {
  return `
    <div class="dato">
      <div class="etiqueta">${etiqueta}</div>
      <div class="valor">${valor}</div>
    </div>
  `;
}

function CampoAccion({
  etiqueta,
  valor,
  cambiar,
  placeholder = "",
}: {
  etiqueta: string;
  valor: string;
  cambiar: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {etiqueta}
      </label>
      <input
        type="text"
        value={valor}
        onChange={(event) => cambiar(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
      />
    </div>
  );
}

function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-600">
        {titulo}
      </p>
      <p className="mt-2 text-lg font-bold text-blue-900">
        {valor}
      </p>
    </div>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">
        {titulo}
      </p>
      <p className="mt-1 font-medium text-gray-900">
        {valor}
      </p>
    </div>
  );
}
