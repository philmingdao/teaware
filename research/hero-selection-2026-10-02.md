# 封面作品选集

核对日期：2026-10-02。从现有收藏选择十件，以官方彩色原图、完整器形、分辨率和年代/材质/窑口的代表性为依据。封面文字使用独立核验数据，图片与说明按同一记录同步切换。

- **建窑兔毫茶盏**（met-51076）：11—12世纪 · 宋代；建窑石器，含铜釉。馆藏编号 29.100.227。[官方记录](https://www.metmuseum.org/art/collection/search/51076)。黑褐釉面上细密的兔毫纹衬托点茶后的白色茶沫，体现宋代建盏的独特审美。
- **龙泉窑青瓷茶碗**（met-48373）：13世纪 · 南宋；龙泉窑青釉石器。馆藏编号 16.122.5。[官方记录](https://www.metmuseum.org/art/collection/search/48373)。温润青釉与简洁碗形相映。口沿保留金漆修补痕迹，见证这件茶碗在日本被珍惜和使用的历史。
- **梅花式宜兴紫砂壶**（met-42323）：17世纪初 · 时大彬；宜兴紫砂。馆藏编号 1982.362a, b。[官方记录](https://www.metmuseum.org/art/collection/search/42323)。壶身以梅花瓣的起伏塑形，紫砂自然的色泽与简练的壶流、提把相呼应；馆方将作者归于时大彬。
- **青花镂空几何纹茶壶**（met-51185）：清代；景德镇瓷器。馆藏编号 79.2.1202a, b。[官方记录](https://www.metmuseum.org/art/collection/search/51185)。方形壶身结合青花几何纹与镂空装饰，以繁密纹样和清晰轮廓展现瓷器工艺。
- **唐代鎏金银高足杯**（cma-128457）：8世纪初 · 唐代；银，内壁鎏金，刻划与錾刻装饰。馆藏编号 1951.396。[官方记录](https://www.clevelandart.org/art/1951.396)。这类银杯可用于饮茶或饮酒。高足造型与装饰反映唐代通过丝绸之路吸收外来器物形式的交流。
- **白釉玉璧底茶碗**（cma-76525）：907—960年 · 五代；白色石器，象牙白釉。馆藏编号 2020.186。[官方记录](https://www.clevelandart.org/art/2020.186)。浅腹、平展的玉璧形底足与柔和白釉构成素雅的茶碗。馆方将其产地记为河南巩县窑。
- **钧窑天蓝釉碗**（cma-94817）：12—13世纪 · 北宋至金；施釉石器。馆藏编号 1915.379。[官方记录](https://www.clevelandart.org/art/1915.379)。天蓝色釉面覆盖饱满的碗壁，口沿与足部显露柔和色差，呈现钧窑釉色与器形的相互映衬。
- **吉州窑玳瑁釉茶盏**（cma-83459）：12—13世纪 · 南宋；吉州窑玳瑁纹褐釉石器。馆藏编号 2020.177。[官方记录](https://www.clevelandart.org/art/2020.177)。深褐底釉上的浅色斑纹如玳瑁壳般交错，是吉州窑茶盏的代表性装饰，也呼应宋代对深色茶器的偏爱。
- **景德镇青白釉杯与盏托**（cma-149952）：12世纪 · 南宋；青白釉瓷。馆藏编号 1980.185。[官方记录](https://www.clevelandart.org/art/1980.185)。杯与盏托成套保存，浅蓝白色的透明釉映衬精巧的托座；青白瓷亦有“影青”之称。
- **明天启五彩梅花杯**（cma-154704）：1621—1627年 · 明天启；青花与五彩釉上彩瓷。馆藏编号 1989.295。[官方记录](https://www.clevelandart.org/art/1989.295)。梅花形杯口与枝干式杯柄将花木意趣融入器形，青花和釉上彩共同描绘明代瓷器的鲜活色彩。

## 来源差异处理

- met-42323 的官方年代为 17 世纪初，而 period 字段写为清代，两者不一致；封面只用确切年代与馆方作者归属，不强行标注朝代。
- met-51185 的最新 API 与网页缓存年代/标题有差异；两者均属清代，封面使用“清代”及照片可确认的青花、镂空几何纹特征。
- cma-76525 的原英文题名含 Ding / Xing，官方产地字段为河南巩县；中文采用可确认的白釉玉璧底器形，介绍保留馆方产地。
- cma-128457 是内壁鎏金的银杯，可作茶杯或酒杯；不声称外壁全部鎏金或专用于饮茶。
- 保留 met-48373 的金漆修补，不将旧器修复成完好新器。

## 图片处理

使用 imagegen skill 与内置 image_gen 工具，逐件提供已检查的官方原图；transparent_background=true。最终透明 WebP 仅进行格式压缩，原始透明 PNG 保留于本地 output。生成图片经过与原图对照，属于展示用途的 AI 背景移除图，学术细节以馆方原图为准。

实际提示词核心（各次附上对应文件与器物细节）：

> Use case: background-extraction. Remove ONLY the photographic backdrop and cast shadow. Preserve the exact historical object silhouette, perspective, proportions, colors, lighting, engraving, glaze, flowers, branches, cracks, chips and foot support. Preserve BOTH cup and stand where present. Make exterior and handle gaps transparent; keep object interiors opaque. Do not redraw, reconstruct, beautify, colorize, invent detail or erase damage. Center the whole object with padding. Output a true RGBA image with transparent background and no new shadow.

每件轮换间隔 10 秒，可手动前后切换或暂停；鼠标停留、键盘焦点进入时暂停，尊重系统减少动态效果设置。
