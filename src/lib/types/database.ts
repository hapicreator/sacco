// FILE: src/lib/types/database.ts
// ACTION: NEW
//
// TypeScript types that match our database schema exactly.
// Use these throughout the app so TypeScript catches errors early.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'sacco_admin' | 'staff' | 'member'

export type AccountType = 'savings' | 'shares' | 'fixed_deposit' | 'loan'

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'loan_disbursement'
  | 'loan_repayment'
  | 'fee'
  | 'interest'
  | 'transfer'

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed'

export type LoanStatus =
  | 'pending'
  | 'approved'
  | 'disbursed'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'rejected'

export type DocumentType =
  | 'receipt'
  | 'loan_form'
  | 'membership_form'
  | 'identity_document'
  | 'other'

export type DocumentStatus = 'uploaded' | 'under_review' | 'approved' | 'rejected'

export type PaymentMethodType = 'mobile_money' | 'bank_transfer' | 'cash' | 'cheque'

export type NotificationType =
  | 'loan_approved'
  | 'loan_rejected'
  | 'deposit_received'
  | 'withdrawal_processed'
  | 'document_reviewed'
  | 'general'

export type SaccoStatus = 'active' | 'suspended' | 'inactive'

export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'exited'

// ─── Table Row Types ──────────────────────────────────────────────────────────

export type Sacco = {
  id: string
  name: string
  registration_no: string | null
  email: string
  phone: string | null
  address: string | null
  district: string | null
  logo_url: string | null
  status: SaccoStatus
  max_members: number
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  date_of_birth: string | null
  national_id: string | null
  gender: 'male' | 'female' | 'other' | null
  created_at: string
  updated_at: string
}

export type SaccoUser = {
  id: string
  sacco_id: string
  user_id: string
  role: UserRole
  is_active: boolean
  joined_at: string
  updated_at: string
}

export type Member = {
  id: string
  sacco_id: string
  user_id: string
  membership_number: string
  status: MemberStatus
  occupation: string | null
  next_of_kin_name: string | null
  next_of_kin_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Account = {
  id: string
  sacco_id: string
  member_id: string
  account_type: AccountType
  account_number: string
  balance: number
  currency: string
  is_active: boolean
  opened_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  sacco_id: string
  account_id: string
  transaction_type: TransactionType
  amount: number
  balance_before: number
  balance_after: number
  status: TransactionStatus
  reference_no: string | null
  description: string | null
  payment_method: PaymentMethodType | null
  performed_by: string | null
  loan_id: string | null
  created_at: string
  updated_at: string
}

export type Loan = {
  id: string
  sacco_id: string
  member_id: string
  loan_account_id: string | null
  amount_applied: number
  amount_approved: number | null
  interest_rate: number
  duration_months: number
  monthly_repayment: number | null
  total_repayable: number | null
  amount_repaid: number
  outstanding_balance: number | null
  purpose: string | null
  status: LoanStatus
  applied_at: string
  approved_at: string | null
  disbursed_at: string | null
  due_date: string | null
  approved_by: string | null
  disbursed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  sacco_id: string
  member_id: string | null
  uploaded_by: string
  document_type: DocumentType
  status: DocumentStatus
  file_name: string
  file_url: string
  file_size_kb: number | null
  mime_type: string | null
  description: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  transaction_id: string | null
  loan_id: string | null
  created_at: string
  updated_at: string
}

export type PaymentMethod = {
  id: string
  sacco_id: string
  method_type: PaymentMethodType
  label: string
  instructions: string | null
  account_name: string | null
  account_number: string | null
  bank_name: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type Notification = {
  id: string
  sacco_id: string
  recipient_user_id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  related_record_id: string | null
  created_at: string
}

export type SaccoSettings = {
  id: string
  sacco_id: string
  currency: string
  min_savings_amount: number
  min_shares_amount: number
  max_loan_multiplier: number
  default_interest_rate: number
  late_payment_penalty_pct: number
  loan_processing_fee_pct: number
  allow_member_self_register: boolean
  require_document_upload: boolean
  sms_notifications_enabled: boolean
  created_at: string
  updated_at: string
}

// ─── Composite / Joined Types ─────────────────────────────────────────────────
// Used when you fetch a record joined with related data

export type MemberWithProfile = Member & {
  profile: Profile
}

export type SaccoUserWithProfile = SaccoUser & {
  profile: Profile
}

// ─── Auth Context Type ────────────────────────────────────────────────────────
// What we store about the logged-in user throughout the app

export type AuthUser = {
  id: string
  email: string
  profile: Profile | null
  saccoUser: SaccoUser | null   // their role in the current active SACCO
  sacco: Sacco | null           // the current active SACCO
}
