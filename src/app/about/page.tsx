import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: '关于展览 | 器 · 茶',
  description: '了解中国茶具艺术展的策展理念、数据来源与开放许可',
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <Header />
      
      {/* Page Header */}
      <section className="pt-32 pb-12 bg-gradient-to-b from-[#f5f3ef] to-[#faf9f7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <span className="text-sm tracking-[0.3em] text-[#b8956c] uppercase font-serif-en">
            About the Exhibition
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-medium tracking-wider text-[#1a1a1a]">
            关于展览
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-[#faf9f7]">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          {/* Curatorial Statement */}
          <article className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-medium tracking-wider text-[#1a1a1a] mb-6">
              策展理念
            </h2>
            <p className="text-[#3d3d3d] leading-relaxed mb-6">
              「器 · 茶」是一场穿越时空的数字茶具艺术之旅。从唐宋时期文人雅士手中的建盏、龙泉青瓷，到明清两代宫廷御用的青花珐琅，每一件茶器都承载着那个时代独特的审美追求与生活智慧。
            </p>
            <p className="text-[#3d3d3d] leading-relaxed mb-6">
              宋人点茶，以黑盏衬白沫，追求「盏色贵青黑，玉毫条达者为上」的极致体验。明人泡茶，紫砂壶成为文人案头清供。清代宫廷，珐琅彩瓷将中西工艺熔于一炉，展现帝王品味。
            </p>
            <p className="text-[#3d3d3d] leading-relaxed mb-6">
              本展览精选大都会艺术博物馆（The Metropolitan Museum of Art）与克利夫兰艺术博物馆（Cleveland Museum of Art）的开放藏品，以博物馆学的严谨态度呈现每件器物的历史脉络与工艺特色。我们希望通过这些穿越时光的茶器，让观者感受中国茶文化的深厚底蕴。
            </p>

            <div className="divider-elegant !my-12"></div>

            <h2 className="text-2xl font-medium tracking-wider text-[#1a1a1a] mb-6">
              展览亮点
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-[#f5f3ef] p-6 rounded-sm">
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">建窑茶盏</h3>
                <p className="text-sm text-[#666] leading-relaxed">
                  宋代点茶文化的代表，黑釉上的「兔毫」「油滴」「曜变」纹理各具神韵，为日本茶道所推崇的「天目」之源。
                </p>
              </div>
              <div className="bg-[#f5f3ef] p-6 rounded-sm">
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">龙泉青瓷</h3>
                <p className="text-sm text-[#666] leading-relaxed">
                  南宋龙泉窑以「梅子青」「粉青」等釉色闻名天下，如玉般温润的质感体现了宋人含蓄内敛的审美理想。
                </p>
              </div>
              <div className="bg-[#f5f3ef] p-6 rounded-sm">
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">宜兴紫砂</h3>
                <p className="text-sm text-[#666] leading-relaxed">
                  「世间茶具之首」，紫砂壶透气性佳，能养茶香，自明代起成为文人雅玩，至今仍是茶人挚爱。
                </p>
              </div>
              <div className="bg-[#f5f3ef] p-6 rounded-sm">
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">官窑瓷器</h3>
                <p className="text-sm text-[#666] leading-relaxed">
                  明清两代景德镇御窑出品，青花、粉彩、珐琅彩各领风骚，代表了中国陶瓷工艺的巅峰成就。
                </p>
              </div>
            </div>

            <div className="divider-elegant !my-12"></div>

            <h2 className="text-2xl font-medium tracking-wider text-[#1a1a1a] mb-6">
              数据来源
            </h2>
            <p className="text-[#3d3d3d] leading-relaxed mb-6">
              本展览所有藏品图片及元数据均来自以下博物馆的开放数据项目，采用 CC0（公共领域）许可，可自由使用：
            </p>
            
            <div className="space-y-6 mb-12">
              <div className="border-l-2 border-[#b8956c] pl-6">
                <h3 className="text-lg font-medium text-[#1a1a1a]">
                  <a 
                    href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-[#b8956c] transition-colors"
                  >
                    The Metropolitan Museum of Art
                  </a>
                </h3>
                <p className="text-sm text-[#666] mt-1 font-serif-en">
                  Open Access Initiative · CC0 Public Domain
                </p>
                <p className="text-sm text-[#999] mt-2">
                  大都会艺术博物馆，位于纽约，是美国最大的艺术博物馆之一，其亚洲艺术部收藏了大量中国历代茶器精品。
                </p>
              </div>
              
              <div className="border-l-2 border-[#b8956c] pl-6">
                <h3 className="text-lg font-medium text-[#1a1a1a]">
                  <a 
                    href="https://www.clevelandart.org/open-access" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-[#b8956c] transition-colors"
                  >
                    Cleveland Museum of Art
                  </a>
                </h3>
                <p className="text-sm text-[#666] mt-1 font-serif-en">
                  Open Access · CC0 Public Domain
                </p>
                <p className="text-sm text-[#999] mt-2">
                  克利夫兰艺术博物馆，以其精品馆藏闻名，尤其在中国陶瓷与宜兴紫砂方面有重要收藏。
                </p>
              </div>
            </div>

            <div className="divider-elegant !my-12"></div>

            <h2 className="text-2xl font-medium tracking-wider text-[#1a1a1a] mb-6">
              技术实现
            </h2>
            <p className="text-[#3d3d3d] leading-relaxed mb-6">
              本网站采用现代 Web 技术构建，追求高性能与优雅的用户体验：
            </p>
            <ul className="text-[#3d3d3d] space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-[#b8956c]">·</span>
                <span>Next.js 15 (App Router) + TypeScript</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#b8956c]">·</span>
                <span>Tailwind CSS 响应式设计</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#b8956c]">·</span>
                <span>静态站点生成 (SSG)，支持 Vercel、GitHub Pages 等平台部署</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#b8956c]">·</span>
                <span>数据通过 Met/CMA Open Access API 获取</span>
              </li>
            </ul>

            <div className="bg-[#1a1a1a] text-[#faf9f7] p-8 rounded-sm mt-12">
              <p className="text-center text-lg tracking-wide">
                「一器一茶，皆有其道」
              </p>
              <p className="text-center text-sm text-[#999] mt-2 font-serif-en">
                Every vessel tells a story of tea and tradition.
              </p>
            </div>
          </article>

          {/* Back to Gallery */}
          <div className="text-center mt-16">
            <Link 
              href="/gallery" 
              className="btn-elegant"
            >
              返回藏品浏览
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
