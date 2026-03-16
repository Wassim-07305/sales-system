// Shared CRM migration presets — extracted from server actions to allow client import

export type CrmSource = "hubspot" | "pipedrive" | "salesforce" | "custom";

export interface MigrationFieldMapping {
  source: string;
  target: string;
  transform?: "none" | "date" | "number" | "tags" | "stage";
}

export interface MigrationConfig {
  source: CrmSource;
  dataType: "contacts" | "deals" | "both";
  mappings: MigrationFieldMapping[];
  options: {
    skipDuplicates: boolean;
    defaultStage?: string;
    mergeExisting: boolean;
  };
}

export interface MigrationResult {
  contactsImported: number;
  contactsSkipped: number;
  contactsErrors: number;
  dealsImported: number;
  dealsSkipped: number;
  dealsErrors: number;
  errors: { row: number; message: string }[];
}

export interface MigrationLog {
  id: string;
  user_id: string;
  source: CrmSource;
  data_type: string;
  contacts_imported: number;
  deals_imported: number;
  total_errors: number;
  file_name: string | null;
  created_at: string;
}

export const CRM_PRESETS: Record<
  CrmSource,
  {
    label: string;
    contactMappings: MigrationFieldMapping[];
    dealMappings: MigrationFieldMapping[];
  }
> = {
  hubspot: {
    label: "HubSpot",
    contactMappings: [
      { source: "First Name", target: "first_name" },
      { source: "Last Name", target: "last_name" },
      { source: "Email", target: "email" },
      { source: "Phone Number", target: "phone" },
      { source: "Company Name", target: "company" },
      { source: "Job Title", target: "position" },
      { source: "Lead Source", target: "source" },
      { source: "Notes", target: "notes" },
      { source: "Contact owner", target: "_ignore" },
      { source: "Create Date", target: "created_at", transform: "date" },
    ],
    dealMappings: [
      { source: "Deal Name", target: "title" },
      { source: "Amount", target: "value", transform: "number" },
      { source: "Deal Stage", target: "stage_name", transform: "stage" },
      { source: "Deal owner", target: "_ignore" },
      { source: "Close Date", target: "next_action_date", transform: "date" },
      { source: "Deal Source", target: "source" },
      { source: "Associated Contact", target: "contact_email" },
      { source: "Notes", target: "notes" },
    ],
  },
  pipedrive: {
    label: "Pipedrive",
    contactMappings: [
      { source: "Nom", target: "last_name" },
      { source: "Prénom", target: "first_name" },
      { source: "E-mail", target: "email" },
      { source: "Téléphone", target: "phone" },
      { source: "Organisation", target: "company" },
      { source: "Titre du poste", target: "position" },
      { source: "Source", target: "source" },
      { source: "Note", target: "notes" },
      { source: "Étiquettes", target: "tags", transform: "tags" },
    ],
    dealMappings: [
      { source: "Titre", target: "title" },
      { source: "Valeur", target: "value", transform: "number" },
      { source: "Étape", target: "stage_name", transform: "stage" },
      { source: "Personne de contact", target: "contact_email" },
      {
        source: "Date de clôture attendue",
        target: "next_action_date",
        transform: "date",
      },
      { source: "Source", target: "source" },
    ],
  },
  salesforce: {
    label: "Salesforce",
    contactMappings: [
      { source: "FirstName", target: "first_name" },
      { source: "LastName", target: "last_name" },
      { source: "Email", target: "email" },
      { source: "Phone", target: "phone" },
      { source: "Account.Name", target: "company" },
      { source: "Title", target: "position" },
      { source: "LeadSource", target: "source" },
      { source: "Description", target: "notes" },
    ],
    dealMappings: [
      { source: "Name", target: "title" },
      { source: "Amount", target: "value", transform: "number" },
      { source: "StageName", target: "stage_name", transform: "stage" },
      { source: "CloseDate", target: "next_action_date", transform: "date" },
      { source: "LeadSource", target: "source" },
      { source: "Description", target: "notes" },
    ],
  },
  custom: {
    label: "Personnalisé",
    contactMappings: [],
    dealMappings: [],
  },
};
