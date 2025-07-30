export var InventoryStatus;
(function (InventoryStatus) {
    InventoryStatus["AVAILABLE"] = "available";
    InventoryStatus["LOW_STOCK"] = "low_stock";
    InventoryStatus["OUT_OF_STOCK"] = "out_of_stock";
    InventoryStatus["DISCONTINUED"] = "discontinued";
})(InventoryStatus || (InventoryStatus = {}));
export var PharmacyIntegrationType;
(function (PharmacyIntegrationType) {
    PharmacyIntegrationType["REST_API"] = "rest_api";
    PharmacyIntegrationType["SOAP_API"] = "soap_api";
    PharmacyIntegrationType["GRAPHQL_API"] = "graphql_api";
})(PharmacyIntegrationType || (PharmacyIntegrationType = {}));
