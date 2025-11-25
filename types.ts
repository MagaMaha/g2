

// --- TYPE DEFINITIONS (matching database schema) ---
export interface Prospect {
  id: number;
  name: string;
  created_at: string;
  contact_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone_number: string | null;
  email: string | null;
}

export interface Contact {
  id: number;
  prospect_id: number;
  contact_name: string;
  contact_date: string | null; // YYYY-MM-DD
  source: string;
  forecast: number;
  actual?: number | null;
  expected_closing: string | null; // YYYY-MM-DD
  actual_close_date?: string | null; // YYYY-MM-DD
  quote_due_date?: string | null; // YYYY-MM-DD
  date_quote_submitted?: string | null; // YYYY-MM-DD
  start_date?: string | null; // YYYY-MM-DD
  actual_start_date?: string | null; // YYYY-MM-DD
  status: string;
  probability: number; // 0-100
  gross_margin: number; // 0-100
  final_gross_margin?: number | null;
  completed: boolean;
  notes: string;
  created_at: string;
  contact_via: string;
}

export interface Document {
    id: number;
    prospect_id: number;
    document_type_id: number;
    description: string;
    notes: string;
    file_name: string;
    storage_path: string;
    created_at: string;
}

export interface ContactChange {
    id: number;
    prospect_id: number;
    contact_id: number;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
}

export interface ProspectRoute {
  id: number;
  prospect_id: number;
  route_id_name: string;
  drivers_needed: number;
  date_assigned: string | null;
  date_filled: string | null;
  created_at: string;
  city: string | null;
  state: string | null;
  distance: number | null;
  price: number | null;
  commission: number | null;
  pct_commission: number | null;
  vehicle_type: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface ProspectRouteDriver {
  id: number;
  prospect_route_id: number | null;
  driver_name: string | null;
  driver_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  phone_number: string | null;
  email: string | null;
  source: string | null;
  status: string;
  recruited_by: string | null;
  date_hired: string | null;
  date_onboarded: string | null;
  date_terminated: string | null;
  date_added: string | null;
  days_to_fill: number | null;
  retention: number | null;
  notes: string | null;
  created_at: string;
  reason_terminated: string | null;
  reason_rejected: string | null;
  vehicle_type: string | null;
  paperwork_in?: string | null;
  drug_bg_check?: string | null;
  status_changed_from?: string | null;
  status_changed_to?: string | null;
  status_change_date?: string | null;
}

export interface DriverSourceOption extends DropdownOption {}
export interface RecruiterOption extends DropdownOption {}
export interface ReasonTerminatedOption extends DropdownOption {}
export interface ReasonRejectedOption extends DropdownOption {}
export interface VehicleTypeOption extends DropdownOption {}
export interface RouteEmailRecipientOption extends DropdownOption {}


export interface DriverStatusOption extends DropdownOption {
    is_slot_filler: boolean;
}

export interface DropdownOption {
    id: number;
    name: string;
    sort_order: number;
}

// Used for generic OptionManager component
export interface ExtendedDropdownOption extends DropdownOption {
    is_slot_filler?: boolean;
}

export type Tab = 'dashboard' | 'bod_report' | 'performance' | 'prospects' | 'drivers' | 'routes' | 'recruiting' | 'documents' | 'admin';
export type UserRole = 'admin' | 'editor' | 'viewer' | 'dispatcher';

export interface UserProfile {
    id: number;
    user_id: string;
    email: string;
    role: UserRole;
}

export interface ModalState {
    mode: 'new' | 'edit' | null;
    prospectId?: number;
    contact?: Contact;
}

export type ProspectFormData = {
    id?: number;
    name: string;
    contact_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone_number: string;
    email: string;
};

// Type for a route with its drivers nested, used for local state management
export type ManagedRoute = ProspectRoute & {
    drivers: Partial<ProspectRouteDriver>[];
};

export type SavePayload = {
    routeUpdates: Partial<ManagedRoute>[];
    routeCreates: Omit<ManagedRoute, 'drivers'>[];
    routeDeletes: number[];
    driverUpdates: Partial<ProspectRouteDriver>[];
    driverCreates: Omit<ProspectRouteDriver, 'id' | 'created_at'>[];
    driverDeletes: number[];
};

export type DocumentFormData = {
    prospect_id: string;
    document_type_id: string;
    description: string;
    notes: string;
}

export type OptionManagerProps = {
    title: string;
    tableName: 'status_options' | 'contact_via_options' | 'document_types' | 'source_options' | 'driver_source_options' | 'driver_status_options' | 'recruiter_options' | 'reason_terminated_options' | 'reason_rejected_options' | 'vehicle_type_options' | 'route_email_recipients';
    options: ExtendedDropdownOption[];
    onAddOption: (tableName: OptionManagerProps['tableName'], name: string) => Promise<void>;
    onUpdateOption: (tableName: OptionManagerProps['tableName'], option: { id: number; name: string; sort_order: number, is_slot_filler?: boolean }) => Promise<void>;
    onDeleteOption: (tableName: OptionManagerProps['tableName'], id: number) => Promise<void>;
    onReorderOption: (tableName: OptionManagerProps['tableName'], options: ExtendedDropdownOption[], index: number, direction: 'up' | 'down') => Promise<void>;
};