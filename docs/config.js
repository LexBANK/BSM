(() => {
  const config = {
    agents: [
      {
        id: "direct",
        labels: { ar: "دردشة مباشرة", en: "Direct Chat" }
      },
      {
        id: "legal-agent",
        labels: { ar: "الوكيل القانوني", en: "Legal Agent" }
      },
      {
        id: "governance-agent",
        labels: { ar: "وكيل الحوكمة", en: "Governance Agent" }
      }
    ],
    models: ["gpt-4o-mini"]
  };

  window.LEXBANK_CONFIG = Object.freeze(config);
})();
