# 4,000 件茶器扩充审核

2026-10-04；正式库由 3,000 增至 4,000 件，新增 1,000 件。

全部 4,000 件使用逐图审核通过的透明图，文件总计 268.4 MiB。

| 馆藏来源 | 本次新增 |
|---|---:|
| National Palace Museum, Taipei | 415 |
| National Museum of Korea | 83 |
| Norsk Folkemuseum | 122 |
| Skansen | 39 |
| Kulturparken Småland/Smålands museum | 25 |
| Nationalmuseum, Sweden | 41 |
| Helsinki City Museum | 41 |
| The National Museum of Finland | 145 |
| Loviisan kaupungin museo | 10 |
| Finnish National Gallery  / Sinebrychoff Art Museum | 4 |
| Koskipirtti ja Museotalo | 15 |
| Satakunnan Museo | 3 |
| Museums of Heinola | 8 |
| Pargas hembygdsmuseum | 1 |
| Naantali Museum | 1 |
| Turku City Museum | 8 |
| Ett Hem | 1 |
| Hämeenlinnan kaupunginmuseo | 1 |
| Vantaan kaupunginmuseo | 2 |
| Porvoon museo | 1 |
| Keski-Suomen museo | 1 |
| Kymenlaakson museo | 1 |
| Sogn og Fjordane | 2 |
| Vänersborgs museum | 4 |
| Fyresdal Bygdemuseum | 1 |
| Larvik Museum | 1 |
| Östergötlands museum | 3 |
| Länsmuseet Gävleborg | 2 |
| Dalarnas museum | 1 |
| Jönköpings läns museum | 9 |
| Odalstunet | 1 |
| Sandefjord kommune | 3 |
| Hallands kulturhistoriska museum | 2 |
| Tekniska museet | 3 |

沿用茶器准入标准；馆方原名、完整馆藏编号、原图与透明图哈希、许可和署名见同名 JSON。每张入选图片已检查黑白底；不重绘器物颜色和纹样。发现断边、标签、展架、拼图、重复视角或不明确茶用途的记录均不入库。

DigitaltMuseum 保留 API 原始许可代码，不擅自补写许可版本；CC BY-SA 的透明衍生图继续按相同许可共享。

正式构建与线上验证结果见下文及 teaware-live-verification-4000-2026-10-04.json。

本地构建验证：准入和身份测试 11 项通过；4000 条公开记录、4000 张唯一透明 WebP 全量哈希匹配，均含 alpha 通道；发布目录 337.3 MiB。浏览器已验证藏品总数、故宫 415 件筛选、作品详情许可和电视模式新增图片。

线上验证（2026-10-04 21:25 北京时间）：GitHub Pages 发布成功，发布提交 `3fc08049c8ba2e7687da82b1d29dd365a97ddc94`，工作流 [37205264692](https://github.com/philmingdao/teaware/actions/runs/37205264692)。线上完整目录与本地构建完全一致：4000 条记录、4000 个唯一透明图片地址；覆盖每个新增馆藏来源的 48 张抽查图片哈希一致，均含透明通道。正式站点浏览器重新加载显示“共 4,000 件藏品”。
