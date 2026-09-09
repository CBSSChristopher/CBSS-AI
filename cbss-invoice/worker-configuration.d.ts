interface Env {
  AUTH_SECRET?: string;
  WAAVE_API_KEY?: string;
  WAAVE_API_SECRET?: string;
  WAAVE_VENUE_ID?: string;
  WAAVE_API_BASE?: string;
  AGENTMAIL_API_KEY?: string;
  AGENTMAIL_INBOX?: string;
  NEXT_STEPS_PDF_URL?: string;
  CRM?: Fetcher;
  INVOICE_STORE?: KVNamespace;
  PUBLIC_TITLE?: string;
}
