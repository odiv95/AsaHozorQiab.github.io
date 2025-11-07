// vapid-keys.js
const VAPID_KEYS = {
    publicKey: 'BO3fSiGfLwlDrq97_OEAKwFC1CtabNDP26YkdOEj-oyodVgix7dokcPuX0L3SGk_nPVAq2uRxu5kG7R17jf5S3s'
};

// فقط در محیط سرور از این استفاده کنید
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VAPID_KEYS;

}

