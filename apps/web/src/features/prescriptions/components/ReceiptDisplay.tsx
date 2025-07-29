import React from 'react';

interface ReceiptDetails {
  receiptNumber: string;
  issueDate: Date;
  taxRate: number;
  taxAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  currency: 'XOF' | 'USD';
  exchangeRate?: number;
  pharmacyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    licenseNumber: string;
    taxId: string;
  };
  medicationDetails: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    prescription: boolean;
  }>;
}

interface Receipt {
  receiptId: string;
  receiptNumber: string;
  paymentId: string;
  orderId: string;
  receiptDetails: ReceiptDetails;
  createdAt: Date;
  gateway: string;
}

interface ReceiptDisplayProps {
  receipt: Receipt;
  onDownloadPDF?: (paymentId: string) => void;
  isLoading?: boolean;
}

export const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({
  receipt,
  onDownloadPDF,
  isLoading = false
}) => {
  const formatCurrency = (amount: number, currency: string): string => {
    if (currency === 'XOF') {
      return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodText = (gateway: string): string => {
    switch (gateway) {
      case 'stripe':
        return 'Carte bancaire / Credit Card';
      case 'paypal':
        return 'PayPal';
      case 'mtn':
        return 'MTN Mobile Money';
      default:
        return 'Paiement électronique / Electronic Payment';
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Facture Normalisée</h2>
            <p className="text-blue-100">Standardized Invoice</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">N° Facture / Invoice No:</p>
            <p className="text-xl font-bold">{receipt.receiptDetails.receiptNumber}</p>
          </div>
        </div>
      </div>

      {/* Pharmacy Information */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">
            {receipt.receiptDetails.pharmacyInfo.name}
          </h3>
          <p className="text-gray-600 mt-1">{receipt.receiptDetails.pharmacyInfo.address}</p>
          <p className="text-gray-600">
            Tél: {receipt.receiptDetails.pharmacyInfo.phone} | 
            Email: {receipt.receiptDetails.pharmacyInfo.email}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Licence N°: {receipt.receiptDetails.pharmacyInfo.licenseNumber} | 
            NIF: {receipt.receiptDetails.pharmacyInfo.taxId}
          </p>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-200">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">
            Informations de facturation / Billing Information
          </h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Date:</span> {formatDate(receipt.receiptDetails.issueDate)}</p>
            <p><span className="font-medium">Mode de paiement / Payment method:</span> {getPaymentMethodText(receipt.gateway)}</p>
            <p><span className="font-medium">Commande / Order ID:</span> {receipt.orderId}</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">
            Informations fiscales / Tax Information
          </h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Taux TVA / VAT Rate:</span> {(receipt.receiptDetails.taxRate * 100).toFixed(0)}%</p>
            <p><span className="font-medium">Monnaie / Currency:</span> {receipt.receiptDetails.currency}</p>
            {receipt.receiptDetails.exchangeRate && (
              <p><span className="font-medium">Taux de change / Exchange Rate:</span> 1 USD = {receipt.receiptDetails.exchangeRate} XOF</p>
            )}
          </div>
        </div>
      </div>

      {/* Medication Details */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-4">
          Détails de la prescription / Prescription Details
        </h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Médicament / Medication
                </th>
                <th className="px-4 py-2 text-center font-medium text-gray-700">
                  Qté
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">
                  Prix Unit. / Unit Price
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {receipt.receiptDetails.medicationDetails.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.prescription && (
                        <p className="text-xs text-green-600 mt-1">Sur ordonnance / Prescription</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatCurrency(item.unitPrice, receipt.receiptDetails.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {formatCurrency(item.totalPrice, receipt.receiptDetails.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sous-total HT / Subtotal:</span>
              <span className="font-medium">
                {formatCurrency(receipt.receiptDetails.subtotalAmount, receipt.receiptDetails.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                TVA {(receipt.receiptDetails.taxRate * 100).toFixed(0)}% / VAT:
              </span>
              <span className="font-medium">
                {formatCurrency(receipt.receiptDetails.taxAmount, receipt.receiptDetails.currency)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL TTC / TOTAL INCL. TAX:</span>
                <span className="text-blue-600">
                  {formatCurrency(receipt.receiptDetails.totalAmount, receipt.receiptDetails.currency)}
                </span>
              </div>
            </div>
            
            {receipt.receiptDetails.exchangeRate && (
              <div className="text-xs text-gray-500 mt-2">
                <p>Équivalent XOF: {formatCurrency(
                  receipt.receiptDetails.totalAmount * receipt.receiptDetails.exchangeRate, 
                  'XOF'
                )}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          <p>Facture générée électroniquement le {formatDate(receipt.createdAt)}</p>
          <p className="mt-1">
            Conforme aux dispositions du Code Général des Impôts du Bénin
          </p>
        </div>
        
        {onDownloadPDF && (
          <button
            onClick={() => onDownloadPDF(receipt.paymentId)}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Téléchargement...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Télécharger PDF / Download PDF
              </>
            )}
          </button>
        )}
      </div>

      {/* Legal Notice */}
      <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-200">
        <div className="text-xs text-yellow-800">
          <p className="font-medium mb-1">Mentions légales / Legal Information:</p>
          <p>
            Pharmacie agréée par l'Ordre National des Pharmaciens du Bénin. 
            Médicaments délivrés sur présentation d'une ordonnance médicale valide. 
            Conservation : tenir hors de portée des enfants, dans un endroit sec et frais.
          </p>
          <p className="mt-1">
            Pharmacy licensed by the National Order of Pharmacists of Benin. 
            Medications dispensed upon presentation of valid medical prescription. 
            Storage: keep out of reach of children, in a dry and cool place.
          </p>
        </div>
      </div>
    </div>
  );
};