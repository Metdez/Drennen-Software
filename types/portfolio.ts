export interface PortfolioConfig {
  scope: 'all' | 'semester'
  semesterId: string | null
  includeStudentProfiles: boolean
  includeReports: boolean
}

export interface PortfolioShareRow {
  id: string
  user_id: string
  share_token: string
  enabled: boolean
  config: PortfolioConfig
  created_at: string
  updated_at: string
}

export interface PortfolioShare {
  id: string
  userId: string
  shareToken: string
  enabled: boolean
  config: PortfolioConfig
  createdAt: string
  updatedAt: string
}

export const DEFAULT_PORTFOLIO_CONFIG: PortfolioConfig = {
  scope: 'all',
  semesterId: null,
  includeStudentProfiles: true,
  includeReports: true,
}
