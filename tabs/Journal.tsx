
import React from 'react';
import { Card, SectionTitle, Button } from '../components/UI';

const Journal: React.FC = () => {
  const posts = [
    { id: '1', user: '小明', content: '第一天到東京，終於吃到敘敘苑了！肉質超嫩～', img: 'https://picsum.photos/seed/food/400/400', likes: 12, date: '10.10' },
    { id: '2', user: '我自己', content: '新宿御苑的草皮好舒服，適合野餐。', img: 'https://picsum.photos/seed/park/400/500', likes: 8, date: '10.10' },
    { id: '3', user: '小美', content: '淺草寺雷門大集合！', img: 'https://picsum.photos/seed/temple/400/300', likes: 15, date: '10.11' },
  ];

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <SectionTitle title="旅行回憶錄" icon={<i className="fas fa-book-open"></i>} />
        <Button className="!p-3 !rounded-2xl"><i className="fas fa-camera"></i></Button>
      </div>

      <div className="columns-2 gap-4 space-y-4">
        {posts.map(post => (
          <div key={post.id} className="break-inside-avoid">
            <Card className="!p-0 overflow-hidden relative group">
              <img src={post.img} alt="post" className="w-full object-cover rounded-t-[1.8rem]" />
              <div className="p-3">
                <p className="text-xs font-bold mb-1">{post.user}</p>
                <p className="text-[10px] opacity-70 line-clamp-2 leading-tight">{post.content}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-shadow-green/50">
                  <span className="text-[8px] opacity-40 uppercase">{post.date}</span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <i className="far fa-heart text-red-400"></i>
                    <span>{post.likes}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Floating Action Tip */}
      <div className="mt-8 bg-accent-orange/10 p-4 rounded-[2rem] text-center border-2 border-accent-orange/20">
        <p className="text-sm italic text-earth-brown opacity-80">"紀錄當下的美好，是旅行最有價值的紀念品。"</p>
      </div>
    </div>
  );
};

export default Journal;
