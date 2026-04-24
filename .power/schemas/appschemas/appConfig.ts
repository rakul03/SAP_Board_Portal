/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file contains Power Apps Portal configuration.
 */

export const appConfig = {
  appId: "a590025f-b36a-4c16-b534-3a16670e3bb9",
  appDisplayName: "DEV-SAP_Portal",
  region: "prod",
  environmentId: "7f8f5b90-2d8e-e620-92cf-cc809f93e90a",
  localAppUrl: "http://localhost:3000",
  dataSources: {
    sapauditlogs: {
      entitySetName: "sap_sapauditlogs",
      logicalName: "sap_sapauditlog",
      isHidden: false,
    },
    sapinitiatives: {
      entitySetName: "sap_sapinitiatives",
      logicalName: "sap_sapinitiative",
      isHidden: false,
    },
    sapportfolioowners: {
      entitySetName: "sap_sapportfolioowners",
      logicalName: "sap_sapportfolioowner",
      isHidden: false,
    },
    sapfavorites: {
      entitySetName: "sap_favorite_saps",
      logicalName: "sap_favorite_sap",
      isHidden: false,
    },
    sapappusers: {
      entitySetName: "sap_appuser_saps",
      logicalName: "sap_appuser_sap",
      isHidden: false,
    },
  },
};
