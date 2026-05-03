export interface DevnetProgram {
  readonly name: string;
  readonly address: string;
}

export const DEVNET_PROGRAMS: readonly DevnetProgram[] = [
  {
    name: "policy_vault",
    address: "8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR",
  },
  {
    name: "trustgate",
    address: "HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N",
  },
  {
    name: "validation_registry",
    address: "Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv",
  },
];
