import React, { useEffect, useState } from 'react';
import certificateService from '../../services/certificateService';
import { extractApiErrorMessage } from '../../services/api';
import type { Certificate, CertificateVerify } from '../../types';
import { 
  Award, Download, ShieldCheck, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

export const MyCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [verifyIdentifier, setVerifyIdentifier] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<CertificateVerify | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Downloading state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchCertificates = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await certificateService.getMyCertificates();
      setCertificates(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to retrieve your certificates from server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleDownload = async (identifier: string) => {
    setDownloadingId(identifier);
    try {
      const blob = await certificateService.downloadCertificate(identifier);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${identifier}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(extractApiErrorMessage(err, 'Failed to download PDF certificate.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVerifySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyIdentifier.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    setVerifyError(null);

    try {
      const res = await certificateService.verifyCertificate(verifyIdentifier.trim());
      setVerifyResult(res);
    } catch (err) {
      setVerifyError(extractApiErrorMessage(err, 'Certificate verification failed or invalid verification code.'));
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">My Participation Certificates</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified digital certificates issued automatically upon event completion and attendance check-in.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
          onClick={() => setIsVerifyModalOpen(true)}
        >
          Verify Any Certificate
        </Button>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Fetching your verified certificates..." rows={3} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load certificates"
          message={error}
          onRetry={fetchCertificates}
        />
      )}

      {/* Empty State */}
      {!loading && !error && certificates.length === 0 && (
        <EmptyState
          title="No Certificates Issued Yet"
          description="Certificates are generated automatically after attending completed events. Attend registered campus events to earn participation certificates."
        />
      )}

      {/* Certificates Grid */}
      {!loading && !error && certificates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    VERIFIED
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {cert.event_title || `Certificate #${cert.certificate_number}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Issue Date: {formatDate(cert.issue_date)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Certificate No:</span>
                    <span className="font-mono text-slate-800 font-semibold">{cert.certificate_number}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Verification Code:</span>
                    <span className="font-mono text-blue-700 font-bold select-all">{cert.verification_code}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVerifyIdentifier(cert.certificate_number);
                    setIsVerifyModalOpen(true);
                  }}
                >
                  Verify Code
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  isLoading={downloadingId === cert.certificate_number}
                  onClick={() => handleDownload(cert.certificate_number)}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        title="Public Certificate Verification"
        description="Enter any certificate number or verification code to check its authenticity against the database."
        onClose={() => {
          setIsVerifyModalOpen(false);
          setVerifyResult(null);
          setVerifyError(null);
        }}
      >
        <div className="space-y-4 py-1">
          <form onSubmit={handleVerifySearch} className="flex gap-2">
            <input
              type="text"
              value={verifyIdentifier}
              onChange={(e) => setVerifyIdentifier(e.target.value)}
              placeholder="e.g. CERT-2026-XXXX or verification code"
              className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
              required
            />
            <Button variant="primary" size="sm" type="submit" isLoading={verifying}>
              Verify
            </Button>
          </form>

          {verifyError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {verifyResult && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Certificate Verified & Valid!</span>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{verifyResult.student_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Event Title:</span>
                  <span className="font-semibold text-slate-800">{verifyResult.event_title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Event Date:</span>
                  <span className="text-slate-700">{formatDate(verifyResult.event_date)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Issue Date:</span>
                  <span className="text-slate-700">{formatDate(verifyResult.issue_date)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Certificate Status:</span>
                  <span className="font-bold text-emerald-700">{verifyResult.status}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MyCertificates;
