import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MaturityChart } from '@/components/PDF/MaturityChart';
import autoTable from 'jspdf-autotable';
import {
  computeIdentitiesAndPeopleScore,
  computeDevicesAndInfrastructureScore,
  computeDataScore,
  getLastThreeMonthsData,
  splitScoreData,
} from './pdfHelper';

interface PDFProps {
  tenantName: string;
  identitiesAndPeopleData: any;
  devicesAndInfrastructureData: any;
  manualWidgets: any[];
  scoreData: number;
  scoreHistory: any;
}

export const generatePdf = async (props: PDFProps) => {
  const { tenantName, identitiesAndPeopleData, devicesAndInfrastructureData, manualWidgets, scoreData, scoreHistory } =
    props;

  const { tickCount: identitiesAndPeopleTickCount, widgetBreakdown } = computeIdentitiesAndPeopleScore(
    identitiesAndPeopleData,
    manualWidgets
  );

  const { tickCount: devicesAndInfrastructureTickCount, widgetBreakdown: devicesAndInfrastructureWidgetBreakdown } =
    computeDevicesAndInfrastructureScore(devicesAndInfrastructureData, manualWidgets);

  const { tickCount: dataTickCount, widgetBreakdown: dataWidgetBreakdown } = computeDataScore(manualWidgets);

  const doc = new jsPDF() as any;

  // ---------------- Header ----------------
  doc.setFontSize(20);
  doc.setTextColor('#006666');
  doc.text(tenantName, 14, 20);

  doc.setFontSize(16);
  doc.setTextColor('#000000');
  doc.text('Cyber Security Maturity Rating', 14, 30);

  doc.setFontSize(14);
  doc.text(`Current Month Maturity Rating: ${scoreData}%`, 14, 45);

  let currentY = 55;

  // ---------------- Prepare chart data ----------------
  const last3Months = getLastThreeMonthsData(scoreHistory);
  const { maturityResult, secureResult } = splitScoreData(last3Months);

  const maturityLabels = maturityResult
    .slice() // copy array to avoid mutating original
    .reverse()
    .map((d) => new Date(d.lastUpdated).toLocaleString('default', { month: 'short', year: 'numeric' }));

  const maturityData = maturityResult
    .slice()
    .reverse()
    .map((d) => parseFloat(d.totalScorePct));

  const secureLabels = secureResult
    .slice()
    .reverse()
    .map((d) => new Date(d.lastUpdated).toLocaleString('default', { month: 'short', year: 'numeric' }));

  const secureData = secureResult
    .slice()
    .reverse()
    .map((d) => parseFloat(d.microsoftSecureScorePct));

  // ---------------- Render Maturity Chart ----------------
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Maturity Score Trend:', 14, currentY);
  currentY += 7;

  const maturityContainer = document.createElement('div');
  maturityContainer.style.position = 'fixed';
  maturityContainer.style.left = '-10000px';
  document.body.appendChild(maturityContainer);

  const maturityRoot = createRoot(maturityContainer);
  maturityRoot.render(<MaturityChart data={maturityData} labels={maturityLabels} />);
  await new Promise((resolve) => setTimeout(resolve, 100));

  const maturityCanvas = await html2canvas(maturityContainer, { scale: 2 });
  const maturityImage = maturityCanvas.toDataURL('image/png');
  const chartWidth = 180;

  doc.addImage(maturityImage, 'PNG', 14, currentY, chartWidth, 100);
  currentY += 100 + 10;

  maturityRoot.unmount();
  document.body.removeChild(maturityContainer);

  // ---------------- Render Secure Chart ----------------
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Secure Score Trend:', 14, currentY);
  currentY += 7;

  const secureContainer = document.createElement('div');
  secureContainer.style.position = 'fixed';
  secureContainer.style.left = '-10000px';
  document.body.appendChild(secureContainer);

  const secureRoot = createRoot(secureContainer);
  secureRoot.render(<MaturityChart data={secureData} labels={secureLabels} />);
  await new Promise((resolve) => setTimeout(resolve, 100));

  const secureCanvas = await html2canvas(secureContainer, { scale: 2 });
  const secureImage = secureCanvas.toDataURL('image/png');

  doc.addImage(secureImage, 'PNG', 14, currentY, chartWidth, 100);
  currentY += 100 + 50;

  secureRoot.unmount();
  document.body.removeChild(secureContainer);
  // ---------------- Recommendations Table ----------------
  doc.addPage();
  currentY = 20; // reset to top margin
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendations Implemented', 14, currentY);
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
  doc.save(`${tenantName}-Cyber-Risk-Executive_Report.pdf`);
};
