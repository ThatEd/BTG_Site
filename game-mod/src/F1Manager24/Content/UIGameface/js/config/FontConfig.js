define(["require", "exports", "common/core/Engine", "common/core/Font", "common/core/System", "common/util/MathUtil"], function (require, exports, Engine, Font_1, System_1, MathUtil_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.applyMinimumFontSize = void 0;
    Engine.whenReady.then(() => {
        let language = (0, System_1.getLanguage)();
        console.log('FontConfig: Init ' + language);
        const languageClassName = 'language_' + System_1.LanguageCode[language];
        document.body.classList.add(languageClassName);
        switch (language) {
            case System_1.Language.Japanese:
                (0, Font_1.load)('F1Font', '../../fonts/JP/NotoSansJP-Bold.otf', 'normal', 'normal');
                (0, Font_1.load)('DisplayFont', '../../fonts/JP/NotoSansJP-Black.otf', 'normal', 'normal');
                (0, Font_1.load)('ParagraphFont', '../../fonts/JP/NotoSansJP-Regular.otf', 'normal', 'normal');
                break;
            case System_1.Language.SimpleChinese:
                (0, Font_1.load)('F1Font', '../../fonts/SC/NotoSansSC-Bold.otf', 'normal', 'normal');
                (0, Font_1.load)('DisplayFont', '../../fonts/SC/NotoSansSC-Black.otf', 'normal', 'normal');
                (0, Font_1.load)('ParagraphFont', '../../fonts/SC/NotoSansSC-Regular.otf', 'normal', 'normal');
                break;
            case System_1.Language.TraditionalChinese:
                (0, Font_1.load)('F1Font', '../../fonts/TC/NotoSansTC-Bold.ttf', 'normal', 'normal');
                (0, Font_1.load)('DisplayFont', '../../fonts/TC/NotoSansTC-Black.ttf', 'normal', 'normal');
                (0, Font_1.load)('ParagraphFont', '../../fonts/TC/NotoSansTC-Regular.ttf', 'normal', 'normal');
                break;
            case System_1.Language.Korean:
                (0, Font_1.load)('F1Font', '../../fonts/SC/NotoSansSC-Bold.otf', 'normal', 'normal');
                (0, Font_1.load)('DisplayFont', '../../fonts/SC/NotoSansSC-Black.otf', 'normal', 'normal');
                (0, Font_1.load)('ParagraphFont', '../../fonts/SC/NotoSansSC-Regular.otf', 'normal', 'normal');
                break;
            case System_1.Language.Russian:
                (0, Font_1.load)('F1Font', '../../fonts/RU/Formula1_CyrGrk-Display-Regular.otf', 'normal', 'normal');
                (0, Font_1.load)('DisplayFont', '../../fonts/RU/Formula1_CyrGrk-Display-Bold_web.otf', 'normal', 'normal');
                (0, Font_1.load)('ParagraphFont', '../../fonts/RU/NotoSans-Regular.ttf', 'normal', 'normal');
                break;
            default:
                (0, Font_1.load)('ParagraphFont', '../../fonts/latin/TitilliumWeb-Regular.ttf', 'normal', 'normal');
                (0, Font_1.load)('F1Font', '../../fonts/latin/Formula1-TV-600Reg.otf', 'normal', 'normal');
                (0, Font_1.load)('DisplayFont', '../../fonts/latin/Formula1-TV-600Bold.ttf', 'normal', 'normal');
                (0, Font_1.load)('F12025Numbers', '../../fonts/Latin/F1-2025-Numbers.ufont', 'normal', 'normal');
                break;
        }
    });
    let currentMinimumFontSize = null;
    function applyMinimumFontSize(i_size) {
        if (i_size != currentMinimumFontSize) {
            if (currentMinimumFontSize != null) {
                document.body.classList.remove('minFontSize' + currentMinimumFontSize);
            }
            currentMinimumFontSize = (0, MathUtil_1.clamp)(14, i_size, 22);
            document.body.classList.add('minFontSize' + currentMinimumFontSize);
        }
    }
    exports.applyMinimumFontSize = applyMinimumFontSize;
});
//# sourceMappingURL=FontConfig.js.map