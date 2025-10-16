import jsPDF from 'jspdf';
import logoImg from '../assets/logo.png';
import { computeDataScore, computeDevicesAndInfrastructureScore, computeIdentitiesAndPeopleScore } from './pdfHelper';
import autoTable from 'jspdf-autotable';

interface PDFProps {
  tenantName: string;
  identitiesAndPeopleData: any;
  devicesAndInfrastructureData: any;
  manualWidgets: any;
  customScore?: any;
}

export const generateTenderInsurerPack = async (props: PDFProps) => {
  const { tenantName, identitiesAndPeopleData, devicesAndInfrastructureData, manualWidgets, customScore } = props;

  const { tickCount: identitiesAndPeopleTickCount, widgetBreakdown } = computeIdentitiesAndPeopleScore(
    identitiesAndPeopleData,
    manualWidgets,
    true
  );

  const { tickCount: devicesAndInfrastructureTickCount, widgetBreakdown: devicesAndInfrastructureWidgetBreakdown } =
    computeDevicesAndInfrastructureScore(devicesAndInfrastructureData, manualWidgets, customScore, true);

  const { tickCount: dataTickCount, widgetBreakdown: dataWidgetBreakdown } = computeDataScore(manualWidgets, true);
  const doc = new jsPDF() as any;

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0]; // e.g. "2025-10-15"

  // ---------------- Header ----------------
  const imgWidth = 75;
  const imgHeight = 25;
  const logoX = (pageWidth - imgWidth) / 2;

  doc.addImage(logoImg, 'PNG', logoX, 10, imgWidth, imgHeight);

  // Date in top-right corner
  doc.setFontSize(10);
  doc.setTextColor('#666666');
  doc.text(formattedDate, pageWidth - 20, 20, { align: 'right' });

  // Title
  doc.setFontSize(20);
  doc.setTextColor('#006666');
  doc.setFont('helvetica', 'bold');
  doc.text('Cyber Risk - Tender / Insurer Pack', pageWidth / 2, 45, { align: 'center' });

  // Tenant name under title
  doc.setFontSize(16);
  doc.setTextColor('#000000');
  doc.setFont('helvetica', 'normal');
  doc.text(tenantName, pageWidth / 2, 55, { align: 'center' });

  // Divider
  doc.setDrawColor(0, 102, 102);
  doc.setLineWidth(0.5);
  doc.line(20, 60, pageWidth - 20, 60);

  let currentY = 80;

  // ---------------- Recommendations Table ----------------
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Implemented controls', 14, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['Section', 'Implemented', 'Total', 'Percentage']],
    body: [
      [
        'Identities & People',
        identitiesAndPeopleTickCount.toString(),
        '5',
        `${((identitiesAndPeopleTickCount / 5) * 100).toFixed(0)}%`,
      ],
      [
        'Devices & Infrastructure',
        devicesAndInfrastructureTickCount.toString(),
        '9',
        `${((devicesAndInfrastructureTickCount / 9) * 100).toFixed(0)}%`,
      ],
      ['Devices', dataTickCount.toString(), '6', `${((dataTickCount / 6) * 100).toFixed(0)}%`],
    ],
    theme: 'grid',
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // ---------------- Identities & People Breakdown ----------------
  doc.setFont('helvetica', 'bold');
  doc.text('Identities & People Breakdown', 14, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [['Widget', 'Implemented']],
    body: widgetBreakdown.map((w) => [w.name, w.tick ? 'Yes' : 'No']),
    theme: 'grid',
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // ---------------- Devices & Infrastructure Breakdown ----------------
  doc.setFont('helvetica', 'bold');
  doc.text('Devices & Infrastructure Breakdown', 14, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [['Widget', 'Implemented']],
    body: devicesAndInfrastructureWidgetBreakdown.map((w) => [w.name, w.tick ? 'Yes' : 'No']),
    theme: 'grid',
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // ---------------- Data Breakdown ----------------
  doc.setFont('helvetica', 'bold');
  doc.text('Data Breakdown', 14, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [['Widget', 'Implemented']],
    body: dataWidgetBreakdown.map((w) => [w.name, w.tick ? 'Yes' : 'No']),
    theme: 'grid',
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // ---------------- Save PDF ----------------
  doc.save(`${tenantName}-Cyber-Risk-Tender_Insurer_Pack-${formattedDate}.pdf`);
};
