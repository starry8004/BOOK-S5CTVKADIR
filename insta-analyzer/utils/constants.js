// 저장소 관련 상수
const STORAGE = {
    MAX_ACCOUNTS: 30,
    KEY: 'instagram_analyzer_accounts'
};

// DOM 선택자 상수
const SELECTORS = {
    STATS: 'header section li',
    USERNAME: 'header h2, header h1',
    BIO: 'header section > div:last-child',
    REELS_VIEW: 'span._aacl, span.x1lliihq',
    REELS_LINK: 'a[href*="/reels"], a[href*="/channel"]',
    REELS_CONTAINER: 'div._aacl._aabd._aa8k._al3l'
};

// UI 관련 상수
const UI = {
    CONTAINER_ID: 'account-analyzer',
    STATUS_ID: 'analysis-status',
    COLORS: {
        SUCCESS: '#4caf50',
        ERROR: '#f44336',
        INFO: '#2196f3',
        WARNING: '#ff9800'
    },
    THEMES: {
        DARK: {
            BACKGROUND: '#1a1a1a',
            SURFACE: '#252525',
            BORDER: '#333',
            TEXT: '#ffffff',
            TEXT_SECONDARY: '#888888'
        }
    }
};

// 메시지 상수
const MESSAGES = {
    ERRORS: {
        DUPLICATE_ACCOUNT: '이미 저장된 계정입니다.',
        STORAGE_FULL: '최대 저장 개수를 초과했습니다. (30개)',
        NO_DATA: '저장된 데이터가 없습니다.',
        ELEMENT_NOT_FOUND: '요소를 찾을 수 없습니다.'
    },
    SUCCESS: {
        SAVED: '저장 완료',
        DELETED: '삭제 완료',
        CLEARED: '초기화 완료',
        ANALYSIS_COMPLETE: '분석 완료!'
    },
    INFO: {
        ANALYZING: '계정 분석 중...',
        COLLECTING: '데이터 수집 중...',
        SAVING: '데이터 저장 중...'
    }
};