export type Role = 'admin' | 'receptionist' | 'client'
export type PropertyType = 'hotel' | 'hostal' | 'departamento'
export type RoomType = 'single' | 'double' | 'triple' | 'suite' | 'shared'

export interface City {
  id: string
  name: string
  created_at: string
}

export interface Services {
  parking: boolean
  parking_spots: number
  laundry: boolean
  food: boolean
  transport: boolean
  cleaning: boolean
  cold_meals: boolean
}

export interface Property {
  id: string
  city_id: string
  name: string
  type: PropertyType
  address: string | null
  icon_url: string | null
  floors: number | null
  services: Services
  active: boolean
  created_at: string
  cities?: City
  rooms?: Room[]
}

export interface Room {
  id: string
  property_id: string
  number: string
  floor: number | null
  type: RoomType | null
  capacity: number
  created_at: string
}

export interface Company {
  id: string
  name: string
  rut: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  active: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  role: Role
  company_id: string | null
  full_name: string | null
  created_at: string
}

export interface Guest {
  id: string
  first_name: string
  last_name_paterno: string
  last_name_materno: string | null
  rut: string | null
  phone: string | null
  company_id: string | null
  created_at: string
}

export interface Stay {
  id: string
  guest_id: string
  room_id: string
  company_id: string
  allocation_id: string | null
  shift_type: string | null
  checked_in_at: string
  checked_out_at: string | null
  estimated_checkout: string | null
  notes: string | null
  checked_in_by: string | null
  checked_out_by: string | null
}

export interface Project {
  id: string
  company_id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
}

export interface Allocation {
  id: string
  company_id: string
  project_id: string | null
  room_id: string
  start_date: string
  end_date: string | null
  created_at: string
  created_by: string | null
}

// Labels de display
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  hotel: 'Hotel',
  hostal: 'Hostal',
  departamento: 'Departamento',
}

export const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Individual',
  double: 'Doble',
  triple: 'Triple',
  suite: 'Suite',
  shared: 'Compartido',
}

export const SERVICE_LABELS: Record<keyof Omit<Services, 'parking_spots'>, string> = {
  parking:    'Estacionamiento',
  laundry:    'Lavandería',
  food:       'Alimentación',
  transport:  'Transporte',
  cleaning:   'Aseo',
  cold_meals: 'Colaciones Frías',
}

// Servicios disponibles por tipo de propiedad
export const SERVICES_BY_TYPE: Record<PropertyType, {
  key: keyof Omit<Services, 'parking_spots'>
  label: string
  hasQuantity?: boolean
  alwaysIncluded?: boolean
}[]> = {
  hotel: [
    { key: 'parking',    label: 'Estacionamiento',  hasQuantity: true },
    { key: 'laundry',    label: 'Lavandería' },
    { key: 'transport',  label: 'Transporte' },
    { key: 'food',       label: 'Alimentación' },
    { key: 'cold_meals', label: 'Colaciones Frías' },
  ],
  hostal: [
    { key: 'parking',    label: 'Estacionamiento',  hasQuantity: true },
    { key: 'laundry',    label: 'Lavandería' },
    { key: 'transport',  label: 'Transporte' },
    { key: 'cold_meals', label: 'Colaciones Frías' },
  ],
  departamento: [
    { key: 'laundry',    label: 'Lavandería' },
    { key: 'food',       label: 'Alimentación' },
    { key: 'cold_meals', label: 'Colaciones Frías' },
    { key: 'transport',  label: 'Transporte' },
    { key: 'cleaning',   label: 'Aseo' },
    { key: 'parking',    label: 'Estacionamiento',  hasQuantity: true },
  ],
}

export const PROPERTY_TYPE_COLORS: Record<PropertyType, string> = {
  hotel:        'bg-[var(--brand-5)] text-[var(--brand)]',
  hostal:       'bg-[var(--senal)]/12 text-[var(--senal-dark)]',
  departamento: 'bg-[var(--gray-100)] text-[var(--gray-700)]',
}

// Roles de usuario
export const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  receptionist: 'Recepcionista',
  client:       'Cliente',
}

// Turnos de faena (check-in)
export const SHIFT_OPTIONS: { value: string; label: string }[] = [
  { value: 'dia',   label: 'Día' },
  { value: 'noche', label: 'Noche' },
  { value: '7x7',   label: '7x7' },
  { value: '14x14', label: '14x14' },
  { value: '4x3',   label: '4x3' },
  { value: 'otro',  label: 'Otro…' },
]

// Filtros de estado de estadías
export const STAY_FILTER_LABELS = {
  activas:     'Activas',
  completadas: 'Completadas',
  todas:       'Todas',
} as const
