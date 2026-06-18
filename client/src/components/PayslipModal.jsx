import React from 'react'

export default function PayslipModal({ payslip, onClose }) {
  if (!payslip) return null

  const getMonthName = (mNum) => {
    const date = new Date()
    date.setMonth(mNum - 1)
    return date.toLocaleString('default', { month: 'long' })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
          <h2 className="font-bold text-slate-800">Payslip Details</h2>
          <div className="space-x-2">
            <button onClick={handlePrint} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">🖨️ Print / Save PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300">Close</button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible payslip-print-area">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-slate-800 tracking-wider uppercase">SALARY SLIP</h1>
            <p className="text-sm font-semibold text-slate-500 uppercase">For the month of {getMonthName(payslip.month)} {payslip.year}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Employee Name</p>
              <p className="font-semibold text-slate-800">{payslip.employeeId?.firstName} {payslip.employeeId?.lastName}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Employee ID</p>
              <p className="font-semibold text-slate-800">{payslip.employeeId?.employeeId || 'N/A'}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase text-xs">
                <th className="p-3 text-left font-bold border border-slate-200 w-1/2">Earnings</th>
                <th className="p-3 text-right font-bold border border-slate-200 w-1/2">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200">Basic Salary</td>
                <td className="p-3 border border-slate-200 text-right font-mono">{(payslip.basicSalary || 0).toLocaleString()}</td>
              </tr>
              {payslip.allowanceBreakdown?.map((a, i) => (
                <tr key={'a'+i}>
                  <td className="p-3 border border-slate-200 text-slate-600">{a.reason}</td>
                  <td className="p-3 border border-slate-200 text-right font-mono text-slate-600">{(a.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
              {(!payslip.allowanceBreakdown || payslip.allowanceBreakdown.length === 0) && payslip.allowances > 0 && (
                <tr>
                  <td className="p-3 border border-slate-200 text-slate-600">Other Allowances</td>
                  <td className="p-3 border border-slate-200 text-right font-mono text-slate-600">{(payslip.allowances || 0).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          <table className="w-full text-sm mb-8 border-collapse">
            <thead>
              <tr className="bg-rose-50 text-rose-800 uppercase text-xs">
                <th className="p-3 text-left font-bold border border-rose-100 w-1/2">Deductions</th>
                <th className="p-3 text-right font-bold border border-rose-100 w-1/2">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {payslip.deductionBreakdown?.map((d, i) => (
                <tr key={'d'+i}>
                  <td className="p-3 border border-rose-100 text-slate-600">{d.reason}</td>
                  <td className="p-3 border border-rose-100 text-right font-mono text-slate-600">{(d.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
              {(!payslip.deductionBreakdown || payslip.deductionBreakdown.length === 0) && payslip.deductions > 0 && (
                <tr>
                  <td className="p-3 border border-rose-100 text-slate-600">Other Deductions</td>
                  <td className="p-3 border border-rose-100 text-right font-mono text-slate-600">{(payslip.deductions || 0).toLocaleString()}</td>
                </tr>
              )}
              {(!payslip.deductionBreakdown || payslip.deductionBreakdown.length === 0) && payslip.deductions === 0 && (
                <tr>
                  <td className="p-3 border border-rose-100 text-slate-400 italic">No deductions</td>
                  <td className="p-3 border border-rose-100 text-right font-mono text-slate-400">0</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="font-black text-emerald-800 uppercase tracking-wider">Net Payable Salary</span>
            <span className="text-xl font-black text-emerald-700 font-mono">₹{(payslip.netSalary || 0).toLocaleString()}</span>
          </div>

          {payslip.remarks && (
            <div className="mt-6 text-xs text-slate-500">
              <span className="font-bold uppercase">Remarks:</span> {payslip.remarks}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .payslip-print-area, .payslip-print-area * { visibility: visible; }
          .payslip-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
        }
      `}</style>
    </div>
  )
}
