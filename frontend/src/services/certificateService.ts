import api from './api';
import type { Certificate, CertificateVerify } from '../types';

export const certificateService = {
  // Get all certificates for authenticated student
  async getMyCertificates(): Promise<Certificate[]> {
    const res = await api.get<Certificate[]>('/certificates/my');
    return res.data;
  },

  // Verify authenticity of a certificate by ID / certificate_number / verification_code
  async verifyCertificate(identifier: string): Promise<CertificateVerify> {
    const res = await api.get<CertificateVerify>(`/certificates/verify/${encodeURIComponent(identifier)}`);
    return res.data;
  },

  // Download PDF binary blob for a certificate
  async downloadCertificate(identifier: string): Promise<Blob> {
    const res = await api.get<Blob>(`/certificates/${encodeURIComponent(identifier)}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default certificateService;
