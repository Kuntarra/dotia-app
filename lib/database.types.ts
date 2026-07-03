export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      registro_actividad: {
        Row: {
          accion: string
          actor_nombre: string | null
          actor_user_id: string | null
          created_at: string
          detalle: Json | null
          entidad: string
          entidad_id: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          accion: string
          actor_nombre?: string | null
          actor_user_id?: string | null
          created_at?: string
          detalle?: Json | null
          entidad: string
          entidad_id?: string | null
          id?: string
          tenant_id?: string
        }
        Update: {
          accion?: string
          actor_nombre?: string | null
          actor_user_id?: string | null
          created_at?: string
          detalle?: Json | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_actividad_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allocations: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          project_id: string | null
          room_id: string
          start_date: string
          tenant_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          project_id?: string | null
          room_id: string
          start_date: string
          tenant_id?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          project_id?: string | null
          room_id?: string
          start_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaciones: {
        Row: {
          cantidad: number
          contenido: string | null
          created_at: string
          dotacion_id: string | null
          entregada: boolean
          entregada_at: string | null
          fecha: string | null
          hora: string | null
          id: string
          proyecto_id: string | null
          punto_entrega: string
          sentido: string
          tenant_id: string
        }
        Insert: {
          cantidad?: number
          contenido?: string | null
          created_at?: string
          dotacion_id?: string | null
          entregada?: boolean
          entregada_at?: string | null
          fecha?: string | null
          hora?: string | null
          id?: string
          proyecto_id?: string | null
          punto_entrega?: string
          sentido?: string
          tenant_id?: string
        }
        Update: {
          cantidad?: number
          contenido?: string | null
          created_at?: string
          dotacion_id?: string | null
          entregada?: boolean
          entregada_at?: string | null
          fecha?: string | null
          hora?: string | null
          id?: string
          proyecto_id?: string | null
          punto_entrega?: string
          sentido?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaciones_dotacion_id_fkey"
            columns: ["dotacion_id"]
            isOneToOne: false
            referencedRelation: "dotaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaciones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
          rut: string | null
          tenant_id: string
        }
        Insert: {
          active?: boolean
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
          rut?: string | null
          tenant_id?: string
        }
        Update: {
          active?: boolean
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
          rut?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cuadrillas: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          proyecto_id: string | null
          tenant_id: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          proyecto_id?: string | null
          tenant_id?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          proyecto_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuadrillas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuadrillas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_recipients: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          id: string
          name: string | null
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digest_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_runs: {
        Row: {
          checked: number
          details: Json | null
          error: string | null
          failed: number
          id: string
          ok: boolean
          ran_at: string
          sent: number
          tenant_id: string | null
        }
        Insert: {
          checked?: number
          details?: Json | null
          error?: string | null
          failed?: number
          id?: string
          ok?: boolean
          ran_at?: string
          sent?: number
          tenant_id?: string | null
        }
        Update: {
          checked?: number
          details?: Json | null
          error?: string | null
          failed?: number
          id?: string
          ok?: boolean
          ran_at?: string
          sent?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digest_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dotaciones: {
        Row: {
          created_at: string
          cuadrilla_id: string | null
          estado: string
          fecha_fin_contrato: string | null
          fecha_inicio_contrato: string | null
          id: string
          notas: string | null
          oficio_id: string | null
          persona_id: string
          proyecto_id: string | null
          tenant_id: string
          tipo_turno_id: string | null
          turno_dias_descanso: number | null
          turno_dias_trabajo: number | null
        }
        Insert: {
          created_at?: string
          cuadrilla_id?: string | null
          estado?: string
          fecha_fin_contrato?: string | null
          fecha_inicio_contrato?: string | null
          id?: string
          notas?: string | null
          oficio_id?: string | null
          persona_id: string
          proyecto_id?: string | null
          tenant_id?: string
          tipo_turno_id?: string | null
          turno_dias_descanso?: number | null
          turno_dias_trabajo?: number | null
        }
        Update: {
          created_at?: string
          cuadrilla_id?: string | null
          estado?: string
          fecha_fin_contrato?: string | null
          fecha_inicio_contrato?: string | null
          id?: string
          notas?: string | null
          oficio_id?: string | null
          persona_id?: string
          proyecto_id?: string | null
          tenant_id?: string
          tipo_turno_id?: string | null
          turno_dias_descanso?: number | null
          turno_dias_trabajo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dotaciones_cuadrilla_id_fkey"
            columns: ["cuadrilla_id"]
            isOneToOne: false
            referencedRelation: "cuadrillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotaciones_oficio_id_fkey"
            columns: ["oficio_id"]
            isOneToOne: false
            referencedRelation: "oficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotaciones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      edp: {
        Row: {
          created_at: string
          emitido_at: string
          estado: string
          factura_fecha: string | null
          id: string
          monto: number | null
          notas: string | null
          periodo: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          emitido_at?: string
          estado?: string
          factura_fecha?: string | null
          id?: string
          monto?: number | null
          notas?: string | null
          periodo: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          emitido_at?: string
          estado?: string
          factura_fecha?: string | null
          id?: string
          monto?: number | null
          notas?: string | null
          periodo?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_bitacora: {
        Row: {
          autor_nombre: string | null
          autor_tenant_id: string
          autor_user_id: string | null
          created_at: string
          detalle: string | null
          dotacion_id: string | null
          id: string
          modulo: string
          persona_id: string | null
          proyecto_id: string
          tipo: string
        }
        Insert: {
          autor_nombre?: string | null
          autor_tenant_id?: string
          autor_user_id?: string | null
          created_at?: string
          detalle?: string | null
          dotacion_id?: string | null
          id?: string
          modulo: string
          persona_id?: string | null
          proyecto_id: string
          tipo: string
        }
        Update: {
          autor_nombre?: string | null
          autor_tenant_id?: string
          autor_user_id?: string | null
          created_at?: string
          detalle?: string | null
          dotacion_id?: string | null
          id?: string
          modulo?: string
          persona_id?: string | null
          proyecto_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_bitacora_dotacion_id_fkey"
            columns: ["dotacion_id"]
            isOneToOne: false
            referencedRelation: "dotaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_bitacora_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_bitacora_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          company_id: string | null
          created_at: string | null
          first_name: string
          id: string
          last_name_materno: string | null
          last_name_paterno: string
          phone: string | null
          rut: string | null
          tenant_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          first_name: string
          id?: string
          last_name_materno?: string | null
          last_name_paterno: string
          phone?: string | null
          rut?: string | null
          tenant_id?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          first_name?: string
          id?: string
          last_name_materno?: string | null
          last_name_paterno?: string
          phone?: string | null
          rut?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lavanderia_bolsas: {
        Row: {
          created_at: string
          dotacion_id: string | null
          entregada_por: string | null
          estado: string
          fecha_entrega: string | null
          fecha_siguiente_rotacion: string | null
          id: string
          persona_id: string | null
          planilla_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dotacion_id?: string | null
          entregada_por?: string | null
          estado?: string
          fecha_entrega?: string | null
          fecha_siguiente_rotacion?: string | null
          id?: string
          persona_id?: string | null
          planilla_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dotacion_id?: string | null
          entregada_por?: string | null
          estado?: string
          fecha_entrega?: string | null
          fecha_siguiente_rotacion?: string | null
          id?: string
          persona_id?: string | null
          planilla_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavanderia_bolsas_dotacion_id_fkey"
            columns: ["dotacion_id"]
            isOneToOne: false
            referencedRelation: "dotaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavanderia_bolsas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavanderia_bolsas_planilla_id_fkey"
            columns: ["planilla_id"]
            isOneToOne: false
            referencedRelation: "lavanderia_planillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavanderia_bolsas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lavanderia_items: {
        Row: {
          bolsa_id: string
          cantidad: number
          created_at: string
          id: string
          nombre: string | null
          prenda_id: string | null
          tenant_id: string
        }
        Insert: {
          bolsa_id: string
          cantidad?: number
          created_at?: string
          id?: string
          nombre?: string | null
          prenda_id?: string | null
          tenant_id?: string
        }
        Update: {
          bolsa_id?: string
          cantidad?: number
          created_at?: string
          id?: string
          nombre?: string | null
          prenda_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavanderia_items_bolsa_id_fkey"
            columns: ["bolsa_id"]
            isOneToOne: false
            referencedRelation: "lavanderia_bolsas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavanderia_items_prenda_id_fkey"
            columns: ["prenda_id"]
            isOneToOne: false
            referencedRelation: "prendas_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavanderia_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      puntos: {
        Row: {
          activa: boolean
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          property_id: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          property_id?: string | null
          tenant_id?: string
          tipo?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          property_id?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "puntos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_turno: {
        Row: {
          activa: boolean
          created_at: string
          dias_descanso: number
          dias_trabajo: number
          horas: number | null
          id: string
          jornada: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          dias_descanso?: number
          dias_trabajo: number
          horas?: number | null
          id?: string
          jornada?: string
          nombre: string
          tenant_id?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          dias_descanso?: number
          dias_trabajo?: number
          horas?: number | null
          id?: string
          jornada?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_turno_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      excepciones: {
        Row: {
          actualizada_at: string | null
          created_at: string
          descripcion: string | null
          dotacion_id: string | null
          estado: string
          id: string
          modulo: string
          persona_id: string | null
          proyecto_id: string | null
          resolucion: string | null
          responsable_nombre: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          actualizada_at?: string | null
          created_at?: string
          descripcion?: string | null
          dotacion_id?: string | null
          estado?: string
          id?: string
          modulo: string
          persona_id?: string | null
          proyecto_id?: string | null
          resolucion?: string | null
          responsable_nombre?: string | null
          tenant_id?: string
          tipo: string
        }
        Update: {
          actualizada_at?: string | null
          created_at?: string
          descripcion?: string | null
          dotacion_id?: string | null
          estado?: string
          id?: string
          modulo?: string
          persona_id?: string | null
          proyecto_id?: string | null
          resolucion?: string | null
          responsable_nombre?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "excepciones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      costos_tarifas: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          modulo: string
          tarifa_clp: number
          tenant_id: string
          unidad: string
          vigencia_desde: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          modulo: string
          tarifa_clp: number
          tenant_id?: string
          unidad: string
          vigencia_desde?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          modulo?: string
          tarifa_clp?: number
          tenant_id?: string
          unidad?: string
          vigencia_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "costos_tarifas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lavanderia_planillas: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
          tenant_id?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavanderia_planillas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lavanderia_planilla_items: {
        Row: {
          created_at: string
          id: string
          nombre: string
          orden: number
          planilla_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          planilla_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          planilla_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavanderia_planilla_items_planilla_id_fkey"
            columns: ["planilla_id"]
            isOneToOne: false
            referencedRelation: "lavanderia_planillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavanderia_planilla_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lavanderia_bolsa_items: {
        Row: {
          bolsa_id: string
          cantidad: number
          created_at: string
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          bolsa_id: string
          cantidad?: number
          created_at?: string
          id?: string
          nombre: string
          tenant_id?: string
        }
        Update: {
          bolsa_id?: string
          cantidad?: number
          created_at?: string
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lavanderia_bolsa_items_bolsa_id_fkey"
            columns: ["bolsa_id"]
            isOneToOne: false
            referencedRelation: "lavanderia_bolsas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lavanderia_bolsa_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oficios: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          tenant_id?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oficios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_directorio: {
        Row: {
          activa: boolean
          created_at: string
          cuadrilla_id: string | null
          id: string
          oficio_id: string | null
          persona_id: string
          tenant_id: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          cuadrilla_id?: string | null
          id?: string
          oficio_id?: string | null
          persona_id: string
          tenant_id?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          cuadrilla_id?: string | null
          id?: string
          oficio_id?: string | null
          persona_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_directorio_oficio_id_fkey"
            columns: ["oficio_id"]
            isOneToOne: false
            referencedRelation: "oficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_directorio_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_directorio_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string
          contacto_emergencia_nombre: string | null
          contacto_emergencia_telefono: string | null
          created_at: string
          fecha_nacimiento: string | null
          id: string
          nacionalidad: string | null
          nombres: string
          numero_documento: string
          pais_documento: string
          telefono: string | null
          tipo_documento: string
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno: string
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          created_at?: string
          fecha_nacimiento?: string | null
          id?: string
          nacionalidad?: string | null
          nombres: string
          numero_documento: string
          pais_documento?: string
          telefono?: string | null
          tipo_documento?: string
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          created_at?: string
          fecha_nacimiento?: string | null
          id?: string
          nacionalidad?: string | null
          nombres?: string
          numero_documento?: string
          pais_documento?: string
          telefono?: string | null
          tipo_documento?: string
        }
        Relationships: []
      }
      plan_alimentacion: {
        Row: {
          almuerzo: string
          cena: string
          created_at: string
          desayuno: string
          dotacion_id: string
          fecha: string
          id: string
          tenant_id: string
        }
        Insert: {
          almuerzo?: string
          cena?: string
          created_at?: string
          desayuno?: string
          dotacion_id: string
          fecha: string
          id?: string
          tenant_id?: string
        }
        Update: {
          almuerzo?: string
          cena?: string
          created_at?: string
          desayuno?: string
          dotacion_id?: string
          fecha?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_alimentacion_dotacion_id_fkey"
            columns: ["dotacion_id"]
            isOneToOne: false
            referencedRelation: "dotaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_alimentacion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prendas_catalogo: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          tenant_id?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prendas_catalogo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active: boolean
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          active: boolean
          address: string | null
          city_id: string
          created_at: string | null
          floors: number | null
          icon_url: string | null
          id: string
          name: string
          services: Json
          tenant_id: string
          type: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city_id: string
          created_at?: string | null
          floors?: number | null
          icon_url?: string | null
          id?: string
          name: string
          services?: Json
          tenant_id?: string
          type: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city_id?: string
          created_at?: string | null
          floors?: number | null
          icon_url?: string | null
          id?: string
          name?: string
          services?: Json
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_proveedor_recursos: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          notas: string | null
          tenant_id: string
          tipo: string
          vinculo_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          notas?: string | null
          tenant_id?: string
          tipo: string
          vinculo_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          notas?: string | null
          tenant_id?: string
          tipo?: string
          vinculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_proveedor_recursos_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "proyecto_proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_proveedores: {
        Row: {
          created_at: string
          estado: string
          id: string
          modulo: string
          proveedor_nombre: string | null
          proveedor_rut: string
          proyecto_id: string
          tenant_id: string
          tenant_proveedor_id: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          modulo?: string
          proveedor_nombre?: string | null
          proveedor_rut: string
          proyecto_id: string
          tenant_id?: string
          tenant_proveedor_id?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          modulo?: string
          proveedor_nombre?: string | null
          proveedor_rut?: string
          proyecto_id?: string
          tenant_id?: string
          tenant_proveedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_proveedores_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_proveedores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_proveedores_tenant_proveedor_id_fkey"
            columns: ["tenant_proveedor_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          ciudad_id: string | null
          codigo: string
          created_at: string
          descripcion: string | null
          estado: string
          faena: string | null
          fecha_fin_estimada: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          ciudad_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          faena?: string | null
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          tenant_id?: string
        }
        Update: {
          ciudad_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          faena?: string | null
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_ciudad_id_fkey"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receptionist_properties: {
        Row: {
          property_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          property_id: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          property_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receptionist_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptionist_properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_subscriptions: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string | null
          email: string
          frequency: string
          id: string
          last_sent_at: string | null
          monthday: number | null
          name: string | null
          project_id: string | null
          property_ids: string[] | null
          report_type: string
          scope_type: string
          send_hour: number
          tenant_id: string | null
          weekdays: number[] | null
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string | null
          email: string
          frequency?: string
          id?: string
          last_sent_at?: string | null
          monthday?: number | null
          name?: string | null
          project_id?: string | null
          property_ids?: string[] | null
          report_type?: string
          scope_type?: string
          send_hour?: number
          tenant_id?: string | null
          weekdays?: number[] | null
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string | null
          email?: string
          frequency?: string
          id?: string
          last_sent_at?: string | null
          monthday?: number | null
          name?: string | null
          project_id?: string | null
          property_ids?: string[] | null
          report_type?: string
          scope_type?: string
          send_hour?: number
          tenant_id?: string | null
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "report_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string | null
          floor: number | null
          id: string
          number: string
          property_id: string
          tenant_id: string
          type: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          floor?: number | null
          id?: string
          number: string
          property_id: string
          tenant_id?: string
          type?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          floor?: number | null
          id?: string
          number?: string
          property_id?: string
          tenant_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rotaciones: {
        Row: {
          ajustada_manual: boolean
          created_at: string
          dotacion_id: string
          estado_ciclo: string
          fecha_fin_esperada: string | null
          fecha_inicio: string | null
          id: string
          numero: number
          tenant_id: string
          vuelo_ida_aeropuerto: string | null
          vuelo_ida_fecha: string | null
          vuelo_ida_hora: string | null
          vuelo_ida_numero: string | null
          vuelo_vuelta_aeropuerto: string | null
          vuelo_vuelta_fecha: string | null
          vuelo_vuelta_hora: string | null
          vuelo_vuelta_numero: string | null
        }
        Insert: {
          ajustada_manual?: boolean
          created_at?: string
          dotacion_id: string
          estado_ciclo?: string
          fecha_fin_esperada?: string | null
          fecha_inicio?: string | null
          id?: string
          numero: number
          tenant_id?: string
          vuelo_ida_aeropuerto?: string | null
          vuelo_ida_fecha?: string | null
          vuelo_ida_hora?: string | null
          vuelo_ida_numero?: string | null
          vuelo_vuelta_aeropuerto?: string | null
          vuelo_vuelta_fecha?: string | null
          vuelo_vuelta_hora?: string | null
          vuelo_vuelta_numero?: string | null
        }
        Update: {
          ajustada_manual?: boolean
          created_at?: string
          dotacion_id?: string
          estado_ciclo?: string
          fecha_fin_esperada?: string | null
          fecha_inicio?: string | null
          id?: string
          numero?: number
          tenant_id?: string
          vuelo_ida_aeropuerto?: string | null
          vuelo_ida_fecha?: string | null
          vuelo_ida_hora?: string | null
          vuelo_ida_numero?: string | null
          vuelo_vuelta_aeropuerto?: string | null
          vuelo_vuelta_fecha?: string | null
          vuelo_vuelta_hora?: string | null
          vuelo_vuelta_numero?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotaciones_dotacion_id_fkey"
            columns: ["dotacion_id"]
            isOneToOne: false
            referencedRelation: "dotaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotaciones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stays: {
        Row: {
          allocation_id: string | null
          checked_in_at: string
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          company_id: string
          dotacion_id: string | null
          estimated_checkout: string | null
          guest_id: string
          id: string
          notes: string | null
          project_id: string | null
          room_id: string
          shift_type: string | null
          tenant_id: string
        }
        Insert: {
          allocation_id?: string | null
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          company_id: string
          dotacion_id?: string | null
          estimated_checkout?: string | null
          guest_id: string
          id?: string
          notes?: string | null
          project_id?: string | null
          room_id: string
          shift_type?: string | null
          tenant_id?: string
        }
        Update: {
          allocation_id?: string | null
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          company_id?: string
          dotacion_id?: string | null
          estimated_checkout?: string | null
          guest_id?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          room_id?: string
          shift_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stays_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_dotacion_id_fkey"
            columns: ["dotacion_id"]
            isOneToOne: false
            referencedRelation: "dotaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modulos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          modulo: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          modulo: string
          tenant_id?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          modulo?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modulos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          billing_day: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          currency: string
          es_demo: boolean
          es_invitado: boolean
          id: string
          limite_personas: number
          logo_url: string | null
          monthly_amount: number | null
          name: string
          notes: string | null
          paid_until: string | null
          payment_status: string
          plan: string | null
          primary_color: string | null
          rut: string | null
          secondary_color: string | null
          slug: string
          solicito_socio_at: string | null
          tipo: string
        }
        Insert: {
          active?: boolean
          billing_day?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string
          es_demo?: boolean
          es_invitado?: boolean
          id?: string
          limite_personas?: number
          logo_url?: string | null
          monthly_amount?: number | null
          name: string
          notes?: string | null
          paid_until?: string | null
          payment_status?: string
          plan?: string | null
          primary_color?: string | null
          rut?: string | null
          secondary_color?: string | null
          slug: string
          solicito_socio_at?: string | null
          tipo?: string
        }
        Update: {
          active?: boolean
          billing_day?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string
          es_demo?: boolean
          es_invitado?: boolean
          id?: string
          limite_personas?: number
          logo_url?: string | null
          monthly_amount?: number | null
          name?: string
          notes?: string | null
          paid_until?: string | null
          payment_status?: string
          plan?: string | null
          primary_color?: string | null
          rut?: string | null
          secondary_color?: string | null
          slug?: string
          solicito_socio_at?: string | null
          tipo?: string
        }
        Relationships: []
      }
      traslado_pasajeros: {
        Row: {
          created_at: string
          dejado_at: string | null
          dotacion_id: string | null
          estado: string
          id: string
          lugar_bajada: string | null
          persona_id: string | null
          subio_at: string | null
          tenant_id: string
          traslado_id: string
        }
        Insert: {
          created_at?: string
          dejado_at?: string | null
          dotacion_id?: string | null
          estado?: string
          id?: string
          lugar_bajada?: string | null
          persona_id?: string | null
          subio_at?: string | null
          tenant_id?: string
          traslado_id: string
        }
        Update: {
          created_at?: string
          dejado_at?: string | null
          dotacion_id?: string | null
          estado?: string
          id?: string
          lugar_bajada?: string | null
          persona_id?: string | null
          subio_at?: string | null
          tenant_id?: string
          traslado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traslado_pasajeros_dotacion_id_fkey"
            columns: ["dotacion_id"]
            isOneToOne: false
            referencedRelation: "dotaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_pasajeros_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_pasajeros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_pasajeros_traslado_id_fkey"
            columns: ["traslado_id"]
            isOneToOne: false
            referencedRelation: "traslados"
            referencedColumns: ["id"]
          },
        ]
      }
      traslado_pasajero_tramos: {
        Row: {
          created_at: string
          id: string
          pasajero_id: string
          tenant_id: string
          tramo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pasajero_id: string
          tenant_id?: string
          tramo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pasajero_id?: string
          tenant_id?: string
          tramo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traslado_pasajero_tramos_pasajero_id_fkey"
            columns: ["pasajero_id"]
            isOneToOne: false
            referencedRelation: "traslado_pasajeros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_pasajero_tramos_tramo_id_fkey"
            columns: ["tramo_id"]
            isOneToOne: false
            referencedRelation: "traslado_tramos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_pasajero_tramos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      traslado_tramos: {
        Row: {
          created_at: string
          destino: string | null
          fecha: string | null
          hora: string | null
          id: string
          modo: string
          notas: string | null
          orden: number
          origen: string | null
          tenant_id: string
          traslado_id: string
        }
        Insert: {
          created_at?: string
          destino?: string | null
          fecha?: string | null
          hora?: string | null
          id?: string
          modo?: string
          notas?: string | null
          orden?: number
          origen?: string | null
          tenant_id?: string
          traslado_id: string
        }
        Update: {
          created_at?: string
          destino?: string | null
          fecha?: string | null
          hora?: string | null
          id?: string
          modo?: string
          notas?: string | null
          orden?: number
          origen?: string | null
          tenant_id?: string
          traslado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traslado_tramos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslado_tramos_traslado_id_fkey"
            columns: ["traslado_id"]
            isOneToOne: false
            referencedRelation: "traslados"
            referencedColumns: ["id"]
          },
        ]
      }
      traslados: {
        Row: {
          conductor_nombre: string | null
          created_at: string
          destino: string | null
          estado: string
          fecha: string | null
          hora: string | null
          id: string
          notas: string | null
          origen: string | null
          proyecto_id: string | null
          sentido: string
          tenant_id: string
          tipo: string
          vehiculo_id: string | null
        }
        Insert: {
          conductor_nombre?: string | null
          created_at?: string
          destino?: string | null
          estado?: string
          fecha?: string | null
          hora?: string | null
          id?: string
          notas?: string | null
          origen?: string | null
          proyecto_id?: string | null
          sentido?: string
          tenant_id?: string
          tipo?: string
          vehiculo_id?: string | null
        }
        Update: {
          conductor_nombre?: string | null
          created_at?: string
          destino?: string | null
          estado?: string
          fecha?: string | null
          hora?: string | null
          id?: string
          notas?: string | null
          origen?: string | null
          proyecto_id?: string | null
          sentido?: string
          tenant_id?: string
          tipo?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traslados_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traslados_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modulos: {
        Row: {
          created_at: string
          id: string
          modulo: string
          nivel: string
          proyecto_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modulo: string
          nivel?: string
          proyecto_id?: string | null
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modulo?: string
          nivel?: string
          proyecto_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modulos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modulos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string | null
          es_cuenta_switch: boolean
          es_planificador: boolean
          es_titular: boolean
          full_name: string | null
          id: string
          is_super_admin: boolean
          persona_id: string | null
          role: string
          tenant_id: string
          ve_costos: boolean
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          es_cuenta_switch?: boolean
          es_planificador?: boolean
          es_titular?: boolean
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          persona_id?: string | null
          role: string
          tenant_id?: string
          ve_costos?: boolean
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          es_cuenta_switch?: boolean
          es_planificador?: boolean
          es_titular?: boolean
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          persona_id?: string | null
          role?: string
          tenant_id?: string
          ve_costos?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          activo: boolean
          capacidad: number
          created_at: string
          descripcion: string | null
          id: string
          identificador: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          activo?: boolean
          capacidad?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          identificador?: string | null
          tenant_id?: string
          tipo?: string
        }
        Update: {
          activo?: boolean
          capacidad?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          identificador?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_directorio: {
        Args: { p_limit?: number; p_offset?: number; p_q?: string }
        Returns: {
          activa: boolean
          apellido_materno: string
          apellido_paterno: string
          nombres: string
          numero_documento: string
          oficio: string
          persona_id: string
          tipo_documento: string
          total: number
        }[]
      }
      costos_resumen: {
        Args: { p_desde: string; p_hasta: string; p_proyecto?: string }
        Returns: {
          modulo: string
          unidad: string
          cantidad_confirmada: number
          tarifa_clp: number
          subtotal_clp: number
        }[]
      }
      actualizar_persona: {
        Args: {
          p_persona_id: string
          p_nombres: string
          p_apellido_paterno: string
          p_apellido_materno?: string
          p_telefono?: string
          p_nacionalidad?: string
          p_fecha_nacimiento?: string
          p_contacto_emergencia_nombre?: string
          p_contacto_emergencia_telefono?: string
        }
        Returns: undefined
      }
      dotaciones_vinculadas: { Args: never; Returns: string[] }
      es_titular: { Args: never; Returns: boolean }
      find_or_create_persona: {
        Args: {
          p_apellido_materno?: string
          p_apellido_paterno: string
          p_fecha_nacimiento?: string
          p_nacionalidad?: string
          p_nombres: string
          p_numero_documento: string
          p_pais_documento?: string
          p_telefono?: string
          p_tipo_documento: string
        }
        Returns: string
      }
      generar_rotaciones: { Args: { p_dotacion_id: string }; Returns: number }
      get_client_property_ids: { Args: never; Returns: string[] }
      get_client_room_ids: { Args: never; Returns: string[] }
      get_my_company: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_tenant: { Args: never; Returns: string }
      get_receptionist_company_ids: { Args: never; Returns: string[] }
      get_receptionist_room_ids: { Args: never; Returns: string[] }
      importar_personas: { Args: { p_rows: Json }; Returns: Json }
      is_super_admin: { Args: never; Returns: boolean }
      nivel_modulo: { Args: { p_modulo: string }; Returns: string }
      personas_vinculadas: { Args: never; Returns: string[] }
      proyectos_vinculados: { Args: never; Returns: string[] }
      puede_ver_costos: { Args: never; Returns: boolean }
      puedo_acceder_proyecto: { Args: { p_proyecto: string }; Returns: boolean }
      recalcular_rotaciones: {
        Args: { p_desde: number; p_dotacion_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      tenants_overview: {
        Args: never
        Returns: {
          active: boolean
          active_stays: number
          billing_day: number
          companies: number
          contact_email: string
          contact_name: string
          contact_phone: string
          id: string
          monthly_amount: number
          name: string
          notes: string
          paid_until: string
          payment_status: string
          properties: number
          rut: string
          slug: string
          total_stays: number
          users: number
          tipo: string
          es_invitado: boolean
          solicito_socio_at: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
