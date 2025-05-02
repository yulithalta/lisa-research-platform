# GDPR Compliance in LISA v3.0.0

## Overview

LISA (Living-lab Integrated Sensing Architecture) v3.0.0 introduces comprehensive GDPR (General Data Protection Regulation) compliance features to ensure the platform meets regulatory requirements for data processing in clinical and research environments. This document outlines the implementation details and usage guidelines for the GDPR features.

## Implemented Features

### 1. Consent Management

The system provides a complete consent management framework that allows:

- **Creation of consent forms** with specific purposes, legal bases, data retention periods, and data categories
- **Collection and storage of user consent** with audit trails including timestamps, IP addresses, and browser information
- **Versioning of consent forms** to track which version a user consented to
- **Withdrawal mechanisms** allowing users to revoke previously given consent
- **Expiration dates** for time-limited consent

Technical implementation:
- Consent forms stored in `/data/gdpr/consents.json`
- User consents stored in `/data/gdpr/user_consents.json`
- All consent operations logged in access logs for auditability

### 2. Access Auditing

A comprehensive logging system tracks all access to personal data:

- **Detailed access logs** recording who accessed what data, when, and for what purpose
- **Monthly rotation** of log files for easier management and retention
- **Configurable retention** of access logs based on organizational policy
- **Filtering and reporting** tools for generating compliance reports

Technical implementation:
- Access logs stored in `/data/gdpr/access_logs_YYYY_MM.json` with monthly rotation
- All data access operations automatically logged by the storage layer
- Exportable and searchable for GDPR audit requirements

### 3. Data Export (Right to Data Portability)

LISA implements mechanisms for users to export their personal data:

- **Complete data export** of all user-related information
- **Structured, machine-readable format** (JSON)
- **Selective export** options for specific data categories
- **On-demand generation** of export packages

Technical implementation:
- Export functionality available through `exportUserData()` method
- Generates portable data package with metadata and original timestamps
- Includes camera configurations, recordings, and sensor data

### 4. Data Deletion (Right to be Forgotten)

The platform supports data deletion capabilities:

- **Complete data deletion** option for all user data
- **Selective deletion** for specific data categories
- **Anonymization options** for data that must be retained
- **Cascading deletion** of related records

Technical implementation:
- Deletion functionality in `deleteUserData()` method
- Optional anonymization preserving statistical integrity
- Retention flags for legally required data with justification

### 5. Data Processing Inventory

LISA maintains a complete inventory of all data processing activities:

- **Categorization of data** by type, sensitivity, and purpose
- **Processing activities** documented with lawful bases
- **Data flows** mapped between system components
- **Third-party processors** documented when applicable

Technical implementation:
- Processing inventory accessible through admin interface
- Regular updates when new processing activities are added
- Links to relevant consent forms and legal bases

## Data Schema

The GDPR implementation adds the following data structures to the system:

### Consent Table
```typescript
interface Consent {
  id: number;
  title: string;
  description: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  legalBasis: string;
  dataRetentionPeriod: number | null; // in days, null for indefinite
  purpose: string;
  dataCategories: string[] | null;
  documentUrl: string | null;
}
```

### UserConsent Table
```typescript
interface UserConsent {
  id: number;
  userId: number;
  consentId: number;
  accepted: boolean;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date | null;
  additionalData: unknown;
  withdrawnAt: Date | null;
}
```

### AccessLog Table
```typescript
interface AccessLog {
  id: number;
  userId: number;
  timestamp: Date;
  action: string; // e.g., "view", "export", "delete"
  resourceType: string; // e.g., "recording", "camera", "user"
  resourceId: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  details: unknown;
}
```

## Usage in Code

### Consent Management

```typescript
// Creating a new consent form
const consentId = await storage.createConsent({
  title: "Research Participation Consent",
  description: "Consent for collecting and analyzing video and sensor data for research purposes",
  version: "1.0",
  legalBasis: "consent",
  purpose: "Medical research on movement patterns",
  dataRetentionPeriod: 365, // 1 year
  dataCategories: ["video", "movement_data", "biometric"]
});

// Recording user consent
const userConsentId = await storage.recordUserConsent({
  userId: 1,
  consentId: consentId,
  accepted: true,
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
  expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)) // 1 year
});

// Withdrawing consent
await storage.withdrawConsent(userConsentId);
```

### Access Logging

```typescript
// Automatically done by the storage layer
// But can be manually logged as well:
await storage.logAccess({
  userId: req.user.id,
  action: "export",
  resourceType: "recordings",
  resourceId: "all",
  success: true,
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
  details: { reason: "GDPR data portability request" }
});
```

### Data Export

```typescript
// Export all user data
const exportPackage = await storage.exportUserData(userId);
res.json(exportPackage);

// Export specific data categories
const videoData = await storage.exportUserData(userId, { 
  dataTypes: ["recordings"] 
});
res.json(videoData);
```

### Data Deletion

```typescript
// Delete all user data
await storage.deleteUserData(userId);

// Delete specific data with anonymization of others
await storage.deleteUserData(userId, {
  deleteTypes: ["personal_info", "recordings"],
  anonymizeTypes: ["analytics_data"]
});
```

## UI Implementation

The GDPR features are accessible through:

1. **Settings > Privacy & Data** - For users to manage their consents, request data exports, and deletion
2. **Admin > GDPR Compliance** - For administrators to manage consent forms and review access logs
3. **Help > GDPR** - Documentation for users about their data rights

## Security Considerations

- All GDPR-related operations are authenticated and authorized
- Sensitive operations (e.g., data deletion) require additional confirmation
- Access logs are immutable and tamper-evident
- Data exports are encrypted when containing sensitive information

## Future Enhancements

- Integration with DPO (Data Protection Officer) workflow for handling data subject requests
- Automated data retention enforcement based on configurable policies
- Enhanced reporting for regulatory compliance audits
- Integration with external consent management platforms

## Conclusion

With the implementation of these GDPR features, LISA v3.0.0 provides a robust framework for ensuring compliance with data protection regulations in clinical and research environments. The platform now meets all requirements for OP5: "Guaranteeing GDPR compliance through consent management and access auditing."