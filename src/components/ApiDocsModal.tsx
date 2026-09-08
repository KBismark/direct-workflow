import React, { useState } from 'react';
import { X, Code2, Copy, Check, Play, Terminal, ArrowRight } from 'lucide-react';
import { Institution } from '../types';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution?: Institution | null;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({
  isOpen,
  onClose,
  institution,
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('get-responses');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;
  const instId = institution?.id || 'inst-1';
  const instToken = institution?.secureToken || 'ug_legon_8f2b1a9c4e7d0f3b';

  const endpoints = [
    {
      id: 'get-responses',
      method: 'GET',
      path: `/api/institutions/${instId}/responses`,
      title: 'List Institution Responses (Spreadsheet Data)',
      description: 'Retrieve all applicant responses, filtered by status, search keyword, or sorted.',
      curl: `curl -X GET "${currentOrigin}/api/institutions/${instId}/responses?status=ALL" \\
  -H "Accept: application/json"`,
    },
    {
      id: 'update-status',
      method: 'PATCH',
      path: `/api/responses/{id}/status`,
      title: 'Approve / Reject Response',
      description: 'Update the approval status of a response. Automatically syncs with the institution\'s Google Sheet.',
      curl: `curl -X PATCH "${currentOrigin}/api/responses/sub-1/status" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "APPROVED", "notes": "Verified through automated API service"}'`,
    },
    {
      id: 'submit-form',
      method: 'POST',
      path: `/api/public/submit/${instToken}`,
      title: 'Programmatic Form Submission',
      description: 'Submit an onboarding entry with all 21 fields via the institution\'s secure public token.',
      curl: `curl -X POST "${currentOrigin}/api/public/submit/${instToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "SURNAME": "MENSAH",
    "OTHER_NAME": "Kwame",
    "DATE_OF_EMPLOYMENT": "2024-01-15",
    "GENDER": "Male",
    "DATE_OF_BIRTH": "1990-06-12",
    "MARITAL_STATUS": "Single",
    "RESIDENTIAL_DIGITAL_ADDRESS": "GA-183-9022",
    "PERSONNEL_MOBILE": "0244123456",
    "INSTITUTION_NAME": "${institution?.name || 'University of Ghana'}",
    "MONTHLY_NET_SALARY": 4500,
    "GHANA_CARD_NUMBER": "GHA-712398412-4",
    "PLACE_OF_WORK_DIGITAL_ADDRESS": "GA-489-1029",
    "GUARANTOR_FULL_NAME": "Joseph Boateng",
    "GUARANTOR_MOBILE_NUMBER": "0208119045",
    "GUARANTOR_PLACE_OF_WORK": "Korle Bu",
    "GUARANTOR_DIGITAL_ADDRESS": "GA-092-3140",
    "GUARANTOR_JOB_DETAIL": "Doctor",
    "GUARANTOR_NET_SALARY": 8500,
    "NAME_OF_BANK": "GCB Bank",
    "BRANCH": "Legon",
    "BANK_ACCOUNT_NUMBER": "1011130049281"
  }'`,
    },
    {
      id: 'export-csv',
      method: 'GET',
      path: `/api/institutions/${instId}/export.csv`,
      title: 'Export Full Spreadsheet CSV',
      description: 'Directly download the institution\'s full tabular dataset for Google Sheets or Excel integration.',
      curl: `curl -X GET "${currentOrigin}/api/institutions/${instId}/export.csv" -o responses.csv`,
    },
  ];

  const currentEp = endpoints.find(e => e.id === selectedEndpoint) || endpoints[0];

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(currentEp.curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2500);
  };

  const handleRunTest = async () => {
    try {
      setIsLoadingTest(true);
      setTestOutput(null);

      let url = currentEp.path;
      let method = currentEp.method;
      let body: any = null;

      if (currentEp.id === 'get-responses') {
        const res = await fetch(url);
        const json = await res.json();
        setTestOutput(JSON.stringify(json, null, 2));
      } else if (currentEp.id === 'update-status') {
        const res = await fetch('/api/responses/sub-1/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED', notes: 'Verified via REST API Playground' }),
        });
        const json = await res.json();
        setTestOutput(JSON.stringify(json, null, 2));
      } else if (currentEp.id === 'submit-form') {
        const res = await fetch(`/api/public/submit/${instToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            SURNAME: 'API_TEST',
            OTHER_NAME: 'Automated Runner',
            DATE_OF_EMPLOYMENT: '2025-01-01',
            GENDER: 'Other',
            DATE_OF_BIRTH: '1995-01-01',
            MARITAL_STATUS: 'Single',
            RESIDENTIAL_DIGITAL_ADDRESS: 'GA-000-0000',
            PERSONNEL_MOBILE: '0200000000',
            INSTITUTION_NAME: institution?.name || 'Institutional Partner',
            MONTHLY_NET_SALARY: 5000,
            GHANA_CARD_NUMBER: 'GHA-000000000-0',
            PLACE_OF_WORK_DIGITAL_ADDRESS: 'GA-000-0000',
            GUARANTOR_FULL_NAME: 'API Guarantor',
            GUARANTOR_MOBILE_NUMBER: '0200000001',
            GUARANTOR_PLACE_OF_WORK: 'Tech Lab',
            GUARANTOR_DIGITAL_ADDRESS: 'GA-000-0000',
            GUARANTOR_JOB_DETAIL: 'Developer',
            GUARANTOR_NET_SALARY: 7500,
            NAME_OF_BANK: 'Standard Bank',
            BRANCH: 'Airport',
            BANK_ACCOUNT_NUMBER: '0000000000',
          }),
        });
        const json = await res.json();
        setTestOutput(JSON.stringify(json, null, 2));
      } else {
        setTestOutput(`// CSV endpoint ready at: ${currentOrigin}${url}\n// Format: text/csv with 27 standard columns.`);
      }
    } catch (err: any) {
      setTestOutput(`Error: ${err.message}`);
    } finally {
      setIsLoadingTest(false);
    }
  };

  return (
    <div
      id="api-docs-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="api-docs-modal"
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-emerald-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Institutional REST API Documentation
              </h2>
              <p className="text-xs text-slate-500">
                Direct programmatic access to your institutions' response data for other applications &amp; systems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[420px]">
          {/* Left Sidebar: Endpoints */}
          <div className="border-r border-slate-200 p-4 bg-slate-50/50 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 block mb-2">
              Endpoints
            </span>
            {endpoints.map((ep) => (
              <button
                key={ep.id}
                onClick={() => {
                  setSelectedEndpoint(ep.id);
                  setTestOutput(null);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex flex-col gap-1 ${
                  selectedEndpoint === ep.id
                    ? 'bg-slate-900 text-white font-medium shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      ep.method === 'GET'
                        ? selectedEndpoint === ep.id
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-800'
                        : ep.method === 'PATCH'
                        ? selectedEndpoint === ep.id
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-amber-100 text-amber-800'
                        : selectedEndpoint === ep.id
                        ? 'bg-sky-500/30 text-sky-300'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="truncate font-semibold">{ep.title}</span>
                </div>
                <span
                  className={`text-[10px] truncate ${
                    selectedEndpoint === ep.id ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {ep.path}
                </span>
              </button>
            ))}
          </div>

          {/* Right Content: Details & Playground */}
          <div className="col-span-2 p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                  {currentEp.method}
                </span>
                <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                  {currentEp.path}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mt-2">{currentEp.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{currentEp.description}</p>
            </div>

            {/* Curl Snippet */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  cURL Request
                </span>
                <button
                  onClick={handleCopyCurl}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg text-slate-200 text-[11px] font-mono overflow-x-auto">
                <pre>{currentEp.curl}</pre>
              </div>
            </div>

            {/* Try Test Request */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Live API Execution</span>
                <button
                  id="run-api-test-btn"
                  onClick={handleRunTest}
                  disabled={isLoadingTest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-white fill-white" />
                  <span>{isLoadingTest ? 'Executing...' : 'Run Request'}</span>
                </button>
              </div>

              {testOutput && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Live Response Payload:</span>
                  <div className="p-3 bg-slate-950 text-emerald-400 rounded-lg text-[11px] font-mono max-h-56 overflow-y-auto border border-slate-800">
                    <pre>{testOutput}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-500">
          <span>All endpoints return standard JSON payloads with CORS enabled.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
