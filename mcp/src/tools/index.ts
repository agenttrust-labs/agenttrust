/**
 * Aggregator: collects every tool from read/, write/, discovery/ into a
 * single ordered list the server registers in one pass.
 */

import type { AnyTool } from "./types";

import { getPolicyTool }              from "./read/get-policy";
import { listPoliciesTool }           from "./read/list-policies";
import { simulatePaymentTool }        from "./read/simulate-payment";
import { getKillswitchTool }          from "./read/get-killswitch";
import { getVelocityTool }            from "./read/get-velocity";
import { getFeedbackLogTool }         from "./read/get-feedback-log";
import { getQuantuReputationTool }    from "./read/get-quantu-reputation";
import { getValidationAttestationTool } from "./read/get-validation-attestation";
import { listFacilitatorsTool }       from "./read/list-facilitators";
import { demoStateTool }              from "./read/demo-state";

import { initAuthorityTool }          from "./write/init-authority";
import { initPolicyTool }             from "./write/init-policy";
import { setKillswitchTool }          from "./write/set-killswitch";
import { requestValidationTool }      from "./write/request-validation";
import { respondToValidationTool }    from "./write/respond-to-validation";
import { emitFeedbackTool }           from "./write/emit-feedback";

import { docsTool }                   from "./discovery/docs";
import { facilitatorWalkthroughTool } from "./discovery/facilitator-walkthrough";
import { explainDecisionTool }        from "./discovery/explain-decision";

export const READ_TOOLS: ReadonlyArray<AnyTool> = [
  getPolicyTool                  as unknown as AnyTool,
  listPoliciesTool               as unknown as AnyTool,
  simulatePaymentTool            as unknown as AnyTool,
  getKillswitchTool              as unknown as AnyTool,
  getVelocityTool                as unknown as AnyTool,
  getFeedbackLogTool             as unknown as AnyTool,
  getQuantuReputationTool        as unknown as AnyTool,
  getValidationAttestationTool   as unknown as AnyTool,
  listFacilitatorsTool           as unknown as AnyTool,
  demoStateTool                  as unknown as AnyTool,
];

export const WRITE_TOOLS: ReadonlyArray<AnyTool> = [
  initAuthorityTool       as unknown as AnyTool,
  initPolicyTool          as unknown as AnyTool,
  setKillswitchTool       as unknown as AnyTool,
  requestValidationTool   as unknown as AnyTool,
  respondToValidationTool as unknown as AnyTool,
  emitFeedbackTool        as unknown as AnyTool,
];

export const DISCOVERY_TOOLS: ReadonlyArray<AnyTool> = [
  docsTool                   as unknown as AnyTool,
  facilitatorWalkthroughTool as unknown as AnyTool,
  explainDecisionTool        as unknown as AnyTool,
];

export const ALL_TOOLS: ReadonlyArray<AnyTool> = [
  ...READ_TOOLS,
  ...WRITE_TOOLS,
  ...DISCOVERY_TOOLS,
];
