import axios from 'axios';

interface AuditInformation {
  userId: string;
  action: string;
  details: string;
  email: string;
}

export const createAuditLog = (information: AuditInformation) => {
  try {
    axios.post('/api/audit', {
      userId: information.userId,
      action: information.action,
      details: information.details,
      email: information.email,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getAuditLogs = async (): Promise<any> => {
  try {
    const response = await axios.get('/api/audit-logs');
    return response.data.auditLogs;
  } catch (error) {
    console.log(error);
  }
};
