import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] dark:bg-[#0a0908] text-[#faf9f7] mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <h3 className="text-2xl tracking-wider mb-4">器 · 茶</h3>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              中国茶具艺术展<br />
              探索跨越千年的器物之美
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm tracking-widest text-[#b8956c] dark:text-[#d4b896] mb-4">导览</h4>
            <nav className="flex flex-col gap-3">
              <Link 
                href="/" 
                className="text-sm text-[#a0a0a0] hover:text-[#faf9f7] transition-colors"
              >
                首页
              </Link>
              <Link 
                href="/gallery" 
                className="text-sm text-[#a0a0a0] hover:text-[#faf9f7] transition-colors"
              >
                藏品浏览
              </Link>
              <Link 
                href="/about" 
                className="text-sm text-[#a0a0a0] hover:text-[#faf9f7] transition-colors"
              >
                关于展览
              </Link>
            </nav>
          </div>

          {/* Credits */}
          <div>
            <h4 className="text-sm tracking-widest text-[#b8956c] dark:text-[#d4b896] mb-4">数据来源与致谢</h4>
            <div className="text-sm text-[#a0a0a0] leading-relaxed space-y-2">
              <p>
                <a 
                  href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-[#faf9f7] transition-colors"
                >
                  The Metropolitan Museum of Art
                </a>
                <br />
                <span className="text-xs">Open Access / CC0</span>
              </p>
              <p>
                <a 
                  href="https://www.clevelandart.org/open-access" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-[#faf9f7] transition-colors"
                >
                  Cleveland Museum of Art
                </a>
                <br />
                <span className="text-xs">Open Access / CC0</span>
              </p>
            </div>
          </div>
        </div>

        <div className="divider-elegant !bg-[#3d3d3d] !my-12"></div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#666]">
          <p>
            本展览所有藏品图片均来自博物馆开放数据，采用 CC0 公共领域许可
          </p>
          <p className="font-serif-en">
            © 2024 Chinese Tea Ware Gallery
          </p>
        </div>
      </div>
    </footer>
  );
}
