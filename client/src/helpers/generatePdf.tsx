import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MaturityChart } from '@/components/PDF/MaturityChart';
import logoImg from '../assets/logo.png';
import { getLastThreeMonthsData, splitScoreData } from './pdfHelper';

interface PDFProps {
  tenantName: string;
  scoreData: number;
  secureScore: number;
  scoreHistory: any;
}

export const generatePdf = async (props: PDFProps) => {
  const { tenantName, scoreData, secureScore, scoreHistory } = props;
  const doc = new jsPDF() as any;
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0]; // e.g. "2025-10-15"

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

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
  doc.text('Cyber Risk - Executive Report', pageWidth / 2, 45, { align: 'center' });

  // Tenant name under title
  doc.setFontSize(16);
  doc.setTextColor('#000000');
  doc.setFont('helvetica', 'normal');
  doc.text(tenantName, pageWidth / 2, 55, { align: 'center' });

  // Divider
  doc.setDrawColor(0, 102, 102);
  doc.setLineWidth(0.5);
  doc.line(20, 60, pageWidth - 20, 60);

  // ---------------- Scores ----------------
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#006666');
  doc.text('Current Maturity Rating', pageWidth / 4, 75, { align: 'center' });
  doc.text('Current Secure Score', (pageWidth / 4) * 3, 75, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor('#000000');
  doc.text(`${scoreData}%`, pageWidth / 4, 90, { align: 'center' });
  doc.text(`${secureScore}%`, (pageWidth / 4) * 3, 90, { align: 'center' });

  let currentY = 110;

  // ---------------- Chart Data ----------------
  const last3Months = getLastThreeMonthsData(scoreHistory);
  const { maturityResult, secureResult } = splitScoreData(last3Months);

  const maturityLabels = maturityResult
    .slice()
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

  const chartWidth = 180;
  const chartHeight = 85;
  const chartSpacing = 20;

  // ---------------- Maturity Chart ----------------
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Maturity Score Trend', 14, currentY);
  currentY += 7;

  const maturityContainer = document.createElement('div');
  maturityContainer.style.position = 'fixed';
  maturityContainer.style.left = '-10000px';
  document.body.appendChild(maturityContainer);

  const maturityRoot = createRoot(maturityContainer);
  maturityRoot.render(<MaturityChart data={maturityData} labels={maturityLabels} />);
  await new Promise((resolve) => setTimeout(resolve, 100));

  const maturityCanvas = await html2canvas(maturityContainer, { scale: 3 });
  const maturityImage = maturityCanvas.toDataURL('image/png');

  doc.addImage(maturityImage, 'PNG', 14, currentY, chartWidth, chartHeight);
  currentY += chartHeight + chartSpacing;

  maturityRoot.unmount();
  document.body.removeChild(maturityContainer);

  // ---------------- Secure Score Chart ----------------
  // Add a new page if we’re too close to the bottom
  if (currentY + chartHeight + 20 > pageHeight) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Secure Score Trend', 14, currentY);
  currentY += 7;

  const secureContainer = document.createElement('div');
  secureContainer.style.position = 'fixed';
  secureContainer.style.left = '-10000px';
  document.body.appendChild(secureContainer);

  const secureRoot = createRoot(secureContainer);
  secureRoot.render(<MaturityChart data={secureData} labels={secureLabels} />);
  await new Promise((resolve) => setTimeout(resolve, 100));

  const secureCanvas = await html2canvas(secureContainer, { scale: 3 });
  const secureImage = secureCanvas.toDataURL('image/png');

  doc.addImage(secureImage, 'PNG', 14, currentY, chartWidth, chartHeight);

  secureRoot.unmount();
  document.body.removeChild(secureContainer);

  // ---------------- Save PDF ----------------
  doc.save(`${tenantName}-Cyber-Risk-Executive_Report-${formattedDate}.pdf`);
};
