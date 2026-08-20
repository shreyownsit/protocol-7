import { ClauseFinding } from "../types/contract";

export const MOCK_CLAUSES: ClauseFinding[] = [
  {
    id: "clause-8-2",
    section: "Section 8.2",
    title: "Termination for Convenience & Ramp-Down Penalties",
    severity: "critical",
    category: "termination",
    originalText: `8.2 Termination for Convenience. Either party may terminate this Agreement without cause upon providing sixty (60) days prior written notice. In the event of such termination by Customer prior to the expiration of the Initial Term, Customer shall immediately pay to Provider an early termination fee equal to one hundred percent (100%) of the remaining contract value across all scheduled renewal periods, plus any unamortized infrastructure costs incurred by Provider.`,
    summary: "Mandates 100% payout of remaining multi-year value plus uncapped unamortized infrastructure costs if terminated early without cause.",
    hasSimulation: true,
    scenarioQuestion: "What is our financial exposure if we terminate at month 14 of the 36-month term?",
    variables: [
      {
        id: "monthsRemaining",
        label: "Remaining Months on Term",
        min: 1,
        max: 36,
        step: 1,
        unit: "months",
        defaultValue: 22,
        baselineValue: 22
      },
      {
        id: "monthlyFee",
        label: "Monthly Service Fee",
        min: 5000,
        max: 50000,
        step: 1000,
        unit: "$",
        defaultValue: 15000,
        baselineValue: 15000
      },
      {
        id: "unamortizedCapex",
        label: "Unamortized Infrastructure Costs",
        min: 0,
        max: 100000,
        step: 5000,
        unit: "$",
        defaultValue: 45000,
        baselineValue: 45000
      },
      {
        id: "penaltyMultiplier",
        label: "Fee Recovery Rate",
        min: 0,
        max: 100,
        step: 5,
        unit: "%",
        defaultValue: 100,
        baselineValue: 100
      }
    ],
    prosecutorFindings: [
      {
        id: "p1",
        title: "Uncapped Infrastructure Cost Recapture",
        description: "The phrase 'plus any unamortized infrastructure costs' provides zero ceiling, definition of eligible expenses, or requirement for third-party auditing.",
        citation: "Section 8.2, line 4"
      },
      {
        id: "p2",
        title: "100% Acceleration on Unearned Periods",
        description: "Demanding 100% of remaining fees across optional or unentered renewal periods constitutes an unenforceable liquidated damage penalty under standard commercial law.",
        citation: "Section 8.2, lines 3-4"
      },
      {
        id: "p3",
        title: "Asymmetric Operational Friction",
        description: "Provider retains mutual right to terminate on 60 days notice without corresponding transitional support obligations.",
        citation: "Section 8.2, line 1"
      }
    ],
    defenseDraft: `8.2 Termination for Convenience. Either party may terminate this Agreement without cause upon ninety (90) days prior written notice. In the event Customer exercises termination prior to the end of the Initial Term, Customer shall pay a prorated transition fee equal to fifty percent (50%) of the remaining fees solely for the remainder of the active Initial Term, capped at a maximum of three (3) months' recurring service fees. Provider shall have no right to recover independent unamortized infrastructure expenses.`,
    auditorEvaluation: {
      status: "pass",
      score: 94,
      reasoning: "The revised clause successfully eliminates future renewal period acceleration, sets a strict 3-month cap on termination fees, removes ambiguous capex recovery, and expands the transition window to 90 days for operational continuity.",
      recommendations: [
        "Cap early termination liability at 3 months recurring fees",
        "Add explicit obligation for Provider to deliver migration assistance during the 90-day notice window",
        "Remove all unamortized capex recapture language"
      ]
    },
    revisionHistory: [
      {
        passNumber: 1,
        defenseDraft: `8.2 Termination for Convenience. Customer may terminate on 60 days notice by paying 75% of remaining initial term fees.`,
        auditorFeedback: "Needs revision: 75% remains above industry standard (typically 25-50% or 3 months maximum) and did not explicitly strike unamortized capex provisions.",
        timestamp: "Pass 1 · 2 mins ago"
      }
    ],
    finalCounterClause: `8.2 Termination for Convenience. Either party may terminate this Agreement, in whole or in part, without cause upon ninety (90) days prior written notice to the other party. If Customer terminates prior to the expiration of the Initial Term pursuant to this Section 8.2, Customer's sole financial obligation shall be payment for Services rendered through the effective date of termination, plus an early termination fee equal to fifty percent (50%) of the remaining monthly fees for the remainder of the Initial Term, in no event to exceed an amount equal to three (3) times the average Monthly Fee. Provider shall not be entitled to any recovery of unamortized capital, setup, or third-party costs, and shall continue to provide standard transition assistance during the notice period.`
  },
  {
    id: "clause-5-4",
    section: "Section 5.4",
    title: "Late Payment Penalties & Compounding Interest",
    severity: "high",
    category: "payment",
    originalText: `5.4 Invoicing and Late Charges. Invoices are due within fifteen (15) days of receipt. Any amount not paid when due shall accrue interest at the rate of two and one-half percent (2.5%) per month, compounded daily, or the maximum rate permitted by law, whichever is higher. Customer shall reimburse Provider for all costs of collection including attorney fees.`,
    summary: "Imposes 2.5% monthly compounding interest (~34.5% APR) starting on day 16 with immediate attorney fee pass-through.",
    hasSimulation: true,
    scenarioQuestion: "What is the penalty accumulation if invoice processing takes 45 days?",
    variables: [
      {
        id: "invoiceAmount",
        label: "Invoice Amount",
        min: 10000,
        max: 200000,
        step: 5000,
        unit: "$",
        defaultValue: 60000,
        baselineValue: 60000
      },
      {
        id: "daysOverdue",
        label: "Days Past Due (Grace is 15d)",
        min: 1,
        max: 90,
        step: 1,
        unit: "days",
        defaultValue: 30,
        baselineValue: 30
      },
      {
        id: "monthlyInterestRate",
        label: "Monthly Interest Rate",
        min: 0.5,
        max: 4.0,
        step: 0.25,
        unit: "%",
        defaultValue: 2.5,
        baselineValue: 2.5
      },
      {
        id: "legalFeeProvision",
        label: "Fixed Collection Assessment",
        min: 0,
        max: 15000,
        step: 500,
        unit: "$",
        defaultValue: 5000,
        baselineValue: 5000
      }
    ],
    prosecutorFindings: [
      {
        id: "p2-1",
        title: "Usurious Effective APR Rate",
        description: "2.5% monthly compounded daily translates to an effective annual rate of 34.48%, which exceeds usury thresholds in multiple jurisdictions.",
        citation: "Section 5.4, lines 2-3"
      },
      {
        id: "p2-2",
        title: "Short 15-Day Payment Window",
        description: "15-day Net terms do not allow sufficient cycle time for enterprise AP verification workflows.",
        citation: "Section 5.4, line 1"
      }
    ],
    defenseDraft: `5.4 Invoicing and Payment. Undisputed invoices shall be payable within forty-five (45) days of receipt. Late payments shall accrue simple interest at the rate of one percent (1.0%) per month (or statutory maximum, whichever is lower).`,
    auditorEvaluation: {
      status: "pass",
      score: 96,
      reasoning: "Adjusted payment terms to standard Net 45, shifted compounding to simple interest, capped at 1% per month, and protected bona fide disputed invoice amounts from accruing interest.",
      recommendations: [
        "Include explicit invoice dispute withholding mechanism",
        "Switch from daily compounding to simple monthly interest"
      ]
    },
    revisionHistory: [],
    finalCounterClause: `5.4 Invoicing and Payment Terms. Undisputed invoices are payable Net forty-five (45) days from receipt of a valid, itemized invoice. If Customer reasonably disputes any invoice portion in good faith, Customer shall notify Provider within thirty (30) days and may withhold payment of disputed amounts without penalty while the parties resolve the dispute. Undisputed overdue balances shall accrue simple interest at a rate of one percent (1.0%) per month or the legal maximum, whichever is lower.`
  },
  {
    id: "clause-11-1",
    section: "Section 11.1",
    title: "Limitation of Liability & Mutual Exclusions",
    severity: "critical",
    category: "liability",
    originalText: `11.1 Limitation of Liability. IN NO EVENT SHALL PROVIDER BE LIABLE FOR ANY CONSEQUENTIAL, INDIRECT, INCIDENTAL, OR PUNITIVE DAMAGES. PROVIDER'S TOTAL AGGREGATE LIABILITY UNDER THIS AGREEMENT SHALL BE STRICTLY LIMITED TO THE FEES ACTUALLY PAID BY CUSTOMER IN THE ONE (1) MONTH PRECEDING THE EVENT GIVING RISE TO LIABILITY. CUSTOMER'S LIABILITY SHALL NOT BE LIMITED.`,
    summary: "Asymmetric 1-month fee cap on Provider liability with total exclusion of consequential damages, while Customer liability remains uncapped.",
    hasSimulation: false,
    scenarioQuestion: "Static term analysis — No adjustable quantitative variables to simulate.",
    variables: [],
    prosecutorFindings: [
      {
        id: "p3-1",
        title: "One-Sided Liability Ceiling",
        description: "Provider limits exposure to a single month of fees (typically ~$15k), which fails to cover even basic data breach forensics or regulatory notifications.",
        citation: "Section 11.1, lines 2-4"
      },
      {
        id: "p3-2",
        title: "Unilateral Customer Exposure",
        description: "Customer liability is completely uncapped while Provider enjoys strict immunities.",
        citation: "Section 11.1, line 4"
      }
    ],
    defenseDraft: `11.1 Mutual Limitation of Liability. Except for breaches of confidentiality or gross negligence, each party's aggregate liability shall be limited to the total fees paid or payable by Customer in the preceding twelve (12) months. Neither party shall be liable for indirect or consequential damages.`,
    auditorEvaluation: {
      status: "pass",
      score: 91,
      reasoning: "Restores symmetry with a mutual 12-month trailing fee cap and includes industry-standard carve-outs for data security and confidentiality breaches.",
      recommendations: [
        "Ensure data protection indemnities sit outside the general liability cap",
        "Align 12-month lookback period mutually"
      ]
    },
    revisionHistory: [],
    finalCounterClause: `11.1 Mutual Limitation of Liability. Except for claims arising from (a) breach of confidentiality obligations under Section 7, (b) gross negligence or willful misconduct, or (c) indemnification obligations under Section 10, neither party's total aggregate liability arising out of or related to this Agreement shall exceed the total amounts paid or payable by Customer under this Agreement in the twelve (12) month period immediately preceding the incident. Neither party shall be liable for consequential, incidental, or special damages.`
  }
];