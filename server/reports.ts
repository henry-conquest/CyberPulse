import { Report, ReportRecipient } from "@shared/schema";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { storage } from "./storage";
import fs from "fs/promises";
import path from "path";
import { MicrosoftGraphService } from "./microsoft";
import { NinjaOneService } from "./ninjaone";

// Function to calculate risk level based on score
function getRiskLevel(score: number): string {
  if (score < 30) return "Low";
  if (score < 70) return "Medium";
  return "High";
}

// Function to generate a PDF report from security data
export async function generatePdfReport(report: Report): Promise<Buffer> {
  try {
    // Get the report data
    const securityData = report.securityData as any;
    const tenant = await storage.getTenant(report.tenantId);
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Add a blank page
    const page = pdfDoc.addPage([612, 792]);
    
    // Get the font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Draw the header
    page.drawText("Executive Cyber Risk Report", {
      x: 50,
      y: 750,
      size: 24,
      font: boldFont,
    });
    
    page.drawText(`${report.month} ${report.year}`, {
      x: 50,
      y: 720,
      size: 16,
      font: font,
    });
    
    // Overall risk level
    page.drawText("Overall Risk Level", {
      x: 300,
      y: 650,
      size: 16,
      font: boldFont,
    });
    
    // Draw gauge chart (simplified version)
    const riskLevel = getRiskLevel(report.overallRiskScore);
    page.drawCircle({
      x: 350,
      y: 600,
      radius: 40,
      borderWidth: 2,
      borderColor: rgb(0, 0, 0),
    });
    
    // Color code based on risk level
    let riskColor;
    if (riskLevel === "Low") {
      riskColor = rgb(0, 0.8, 0);
    } else if (riskLevel === "Medium") {
      riskColor = rgb(1, 0.6, 0);
    } else {
      riskColor = rgb(1, 0, 0);
    }
    
    page.drawText(`${report.overallRiskScore}%`, {
      x: 335,
      y: 600,
      size: 18,
      font: boldFont,
      color: riskColor,
    });
    
    page.drawText(riskLevel, {
      x: 335,
      y: 580,
      size: 14,
      font: boldFont,
      color: riskColor,
    });
    
    // Risk categories
    page.drawText("Security Risk Categories", {
      x: 50,
      y: 520,
      size: 16,
      font: boldFont,
    });
    
    // Draw risk category scores
    const categories = [
      { name: "Identity Risk", score: report.identityRiskScore },
      { name: "Training Risk", score: report.trainingRiskScore },
      { name: "Device Risk", score: report.deviceRiskScore },
      { name: "Cloud Risk", score: report.cloudRiskScore },
      { name: "Threat Risk", score: report.threatRiskScore },
    ];
    
    let yPos = 490;
    categories.forEach(category => {
      page.drawText(category.name, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      
      page.drawText(`${category.score}%`, {
        x: 250,
        y: yPos,
        size: 12,
        font: boldFont,
        color: getRiskLevel(category.score) === "Low" 
          ? rgb(0, 0.8, 0) 
          : getRiskLevel(category.score) === "Medium" 
            ? rgb(1, 0.6, 0) 
            : rgb(1, 0, 0),
      });
      
      page.drawText(getRiskLevel(category.score), {
        x: 300,
        y: yPos,
        size: 12,
        font: boldFont,
        color: getRiskLevel(category.score) === "Low" 
          ? rgb(0, 0.8, 0) 
          : getRiskLevel(category.score) === "Medium" 
            ? rgb(1, 0.6, 0) 
            : rgb(1, 0, 0),
      });
      
      yPos -= 30;
    });
    
    // Threats section
    page.drawText("Detected Threats", {
      x: 50,
      y: 300,
      size: 16,
      font: boldFont,
    });
    
    page.drawText(`Identity Threats: ${securityData.threatMetrics.identityThreats}`, {
      x: 50,
      y: 270,
      size: 12,
      font: font,
    });
    
    page.drawText(`Device Threats: ${securityData.threatMetrics.deviceThreats}`, {
      x: 50,
      y: 250,
      size: 12,
      font: font,
    });
    
    page.drawText(`Other Threats: ${securityData.threatMetrics.otherThreats}`, {
      x: 50,
      y: 230,
      size: 12,
      font: font,
    });
    
    // Analyst comments
    page.drawText("Analyst Comments", {
      x: 50,
      y: 190,
      size: 16,
      font: boldFont,
    });
    
    // Split analyst comments into multiple lines
    const comments = report.analystComments || "No analyst comments provided.";
    const wrappedComments = wrapText(comments, 80);
    yPos = 160;
    
    wrappedComments.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: yPos,
        size: 10,
        font: font,
      });
      yPos -= 15;
    });
    
    // Save the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error("Error generating PDF report:", error);
    throw error;
  }
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > maxCharsPerLine) {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

// Function to calculate overall risk score based on security metrics
export function calculateRiskScores(securityData: any): {
  overallRiskScore: number;
  identityRiskScore: number;
  trainingRiskScore: number;
  deviceRiskScore: number;
  cloudRiskScore: number;
  threatRiskScore: number;
} {
  // Identity risk calculation (weight: 30%)
  let identityRiskScore = 0;
  
  // Each identity metric contributes to the overall identity risk
  if (securityData.identityMetrics.mfaNotEnabled > 0) {
    identityRiskScore += 25;
  }
  
  if (!securityData.identityMetrics.phishResistantMfa) {
    identityRiskScore += 20;
  }
  
  if (securityData.identityMetrics.globalAdmins > 2) {
    identityRiskScore += 15;
  }
  
  if (!securityData.identityMetrics.riskBasedSignOn) {
    identityRiskScore += 15;
  }
  
  if (!securityData.identityMetrics.roleBasedAccessControl) {
    identityRiskScore += 10;
  }
  
  if (!securityData.identityMetrics.singleSignOn) {
    identityRiskScore += 10;
  }
  
  if (!securityData.identityMetrics.managedIdentityProtection) {
    identityRiskScore += 5;
  }
  
  // Cap the score at 100
  identityRiskScore = Math.min(identityRiskScore, 100);
  
  // Training risk calculation (weight: 20%)
  // If there's no training in place, it's a 100% risk
  const trainingRiskScore = 100;
  
  // Device risk calculation (weight: 20%)
  let deviceRiskScore = 0;
  
  if (!securityData.deviceMetrics.diskEncryption) {
    deviceRiskScore += 25;
  }
  
  if (!securityData.deviceMetrics.defenderForEndpoint) {
    deviceRiskScore += 25;
  }
  
  if (!securityData.deviceMetrics.deviceHardening) {
    deviceRiskScore += 20;
  }
  
  if (!securityData.deviceMetrics.softwareUpdated) {
    deviceRiskScore += 15;
  }
  
  if (!securityData.deviceMetrics.managedDetectionResponse) {
    deviceRiskScore += 15;
  }
  
  // Cap the score
  deviceRiskScore = Math.min(deviceRiskScore, 100);
  
  // Cloud risk calculation (weight: 20%)
  let cloudRiskScore = 0;
  
  if (!securityData.cloudMetrics.saasProtection) {
    cloudRiskScore += 10;
  }
  
  if (!securityData.cloudMetrics.sensitivityLabels) {
    cloudRiskScore += 10;
  }
  
  if (!securityData.cloudMetrics.backupArchiving) {
    cloudRiskScore += 15;
  }
  
  if (!securityData.cloudMetrics.dataLossPrevention) {
    cloudRiskScore += 10;
  }
  
  if (!securityData.cloudMetrics.defenderFor365) {
    cloudRiskScore += 15;
  }
  
  if (!securityData.cloudMetrics.suitableFirewall) {
    cloudRiskScore += 10;
  }
  
  if (!securityData.cloudMetrics.dkimPolicies) {
    cloudRiskScore += 5;
  }
  
  if (!securityData.cloudMetrics.dmarcPolicies) {
    cloudRiskScore += 5;
  }
  
  if (!securityData.cloudMetrics.conditionalAccess) {
    cloudRiskScore += 10;
  }
  
  if (!securityData.cloudMetrics.compliancePolicies) {
    cloudRiskScore += 5;
  }
  
  if (securityData.cloudMetrics.byodPolicies !== true) {
    cloudRiskScore += 5;
  }
  
  // Cap the score
  cloudRiskScore = Math.min(cloudRiskScore, 100);
  
  // Threat risk calculation (weight: 10%)
  let threatRiskScore = 0;
  
  // Base risk on detected threats
  const totalThreats = 
    securityData.threatMetrics.identityThreats + 
    securityData.threatMetrics.deviceThreats + 
    securityData.threatMetrics.otherThreats;
    
  if (totalThreats > 10) {
    threatRiskScore = 100;
  } else if (totalThreats > 5) {
    threatRiskScore = 75;
  } else if (totalThreats > 2) {
    threatRiskScore = 50;
  } else if (totalThreats > 0) {
    threatRiskScore = 25;
  } else {
    threatRiskScore = 0;
  }
  
  // Calculate overall risk score based on weighted category scores
  const overallRiskScore = Math.round(
    (identityRiskScore * 0.3) +
    (trainingRiskScore * 0.2) +
    (deviceRiskScore * 0.2) +
    (cloudRiskScore * 0.2) +
    (threatRiskScore * 0.1)
  );
  
  return {
    overallRiskScore,
    identityRiskScore,
    trainingRiskScore,
    deviceRiskScore,
    cloudRiskScore,
    threatRiskScore
  };
}

// Function to fetch security data from Microsoft 365 and NinjaOne for a tenant
export async function fetchSecurityDataForTenant(tenantId: number) {
  // In a development environment without real M365 and NinjaOne connections,
  // we'll use mock data to demonstrate the application functionality
  if (process.env.NODE_ENV === 'development') {
    console.log("Using mock data for development environment");
    
    // Mock security data for development testing
    const mockSecurityData = {
      secureScore: 52,
      secureScorePercent: 52,
      identityMetrics: {
        mfaNotEnabled: 17,
        phishResistantMfa: false,
        globalAdmins: 3,
        riskBasedSignOn: false,
        roleBasedAccessControl: true,
        singleSignOn: false,
        managedIdentityProtection: false,
      },
      deviceMetrics: {
        deviceScore: 65,
        diskEncryption: false,
        defenderForEndpoint: true,
        deviceHardening: false,
        softwareUpdated: true,
        managedDetectionResponse: false,
        totalDevices: 24,
        compliantDevices: 19,
        nonCompliantDevices: 4,
        unknownDevices: 1,
        compliancePercentage: 78,
      },
      cloudMetrics: {
        saasProtection: false,
        sensitivityLabels: false,
        backupArchiving: true,
        dataLossPrevention: false,
        defenderFor365: true,
        suitableFirewall: true,
        dkimPolicies: true,
        dmarcPolicies: true,
        conditionalAccess: false,
        compliancePolicies: false,
        byodPolicies: "Partial",
      },
      threatMetrics: {
        identityThreats: 5,
        deviceThreats: 1,
        otherThreats: 0,
      }
    };

    // Calculate risk scores based on mock data
    console.log("Calculating risk scores for mock data");
    const mockRiskScores = calculateRiskScores(mockSecurityData);
    console.log("Calculated mock risk scores:", mockRiskScores);
    
    return {
      securityData: mockSecurityData,
      ...mockRiskScores
    };
  }

  try {
    // Get Microsoft 365 connection for tenant
    const ms365Connection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);
    if (!ms365Connection) {
      throw new Error("Microsoft 365 connection not found for tenant");
    }
    
    // Get NinjaOne connection for tenant
    const ninjaConnection = await storage.getNinjaOneConnectionByTenantId(tenantId);
    if (!ninjaConnection) {
      throw new Error("NinjaOne connection not found for tenant");
    }
    
    // Initialize services
    const msService = new MicrosoftGraphService(ms365Connection);
    const ninjaService = new NinjaOneService(ninjaConnection);
    
    // Fetch data from Microsoft Graph
    const msMetrics = await msService.getSecurityMetrics();
    
    // Fetch data from NinjaOne
    const ninjaMetrics = await ninjaService.getDeviceMetrics();
    
    // Combine the data
    const securityData = {
      secureScore: msMetrics.secureScore,
      secureScorePercent: msMetrics.secureScorePercent,
      identityMetrics: msMetrics.identityMetrics,
      deviceMetrics: {
        ...msMetrics.deviceMetrics,
        totalDevices: ninjaMetrics.totalDevices,
        compliantDevices: ninjaMetrics.compliantDevices,
        nonCompliantDevices: ninjaMetrics.nonCompliantDevices,
        unknownDevices: ninjaMetrics.unknownDevices,
        compliancePercentage: ninjaMetrics.compliancePercentage,
      },
      cloudMetrics: msMetrics.cloudMetrics,
      threatMetrics: msMetrics.threatMetrics,
    };
    
    // Calculate risk scores
    const riskScores = calculateRiskScores(securityData);
    
    return {
      securityData,
      ...riskScores
    };
  } catch (error) {
    console.error("Error fetching security data for tenant:", error);
    throw error;
  }
}

// Function to schedule report generation
export function scheduleMonthlyReports() {
  // Logic to schedule automatic report generation
  // This would be implemented with a library like node-schedule
  // For now, we'll just have the endpoint to trigger generation
  console.log("Monthly report generation scheduled");
}
