export type Role = 'superadmin' | 'user' | 'vendor'
export type Session = 'AM' | 'PM'

export interface Account {
  id: string
  account: string
  password_hash?: string
  display_name: string
  role: Role
  created_at: string
}

export interface Vendor {
  id: string
  name: string
  contact: string | null
  account: string
  password_hash?: string
  created_at: string
}

export interface Record {
  id: string
  vendor_id: string
  date: string
  session: Session
  file_hash: string
  file_path: string
  uploaded_at: string
  vendor?: Vendor
}

export interface ReportConfig {
  id: number
  enabled: boolean
  am_time: string
  pm_time: string
}

export interface ReportEmail {
  id: string
  email: string
}

export interface AuthUser {
  id: string
  account: string
  display_name: string
  role: Role
  type: 'account' | 'vendor'
}

export interface VendorRecord {
  vendor: Vendor
  records: Record[]
  count: number
  hasReported: boolean
}
