import React from 'react';
import { Trash2, FileText, Sparkles, Wand2, Copy, Check } from 'lucide-react';
import { countWords, countChars } from '../utils/documentParser.ts';

interface TextInputTabProps {
  text: string;
  onChangeText: (val: string) => void;
  onClear: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const SAMPLE_TEXTS = [
  {
    label: '📰 Bản tin thời sự & Kinh tế',
    text: `Hôm nay, ngày 05/10/2026, thị trường tài chính ghi nhận nhiều biến động tích cực. Doanh nghiệp công nghệ đã xuất khẩu hơn 2.500.000 sản phẩm với tổng giá trị đạt 18.500.000.000 đ, tăng 32.5% so với cùng kỳ năm ngoái. Nhiệt độ ngoài trời hiện tại là 28°C, độ ẩm 75% và gió nhẹ 15 km/h. Các chuyên gia dự báo nền kinh tế số sẽ tiếp tục tăng trưởng mạnh mẽ trong quý tới.`,
  },
  {
    label: '📖 Đoạn trích Đắc Nhân Tâm',
    text: `Chương 1: Muốn lấy mật thì đừng phá tổ ong.
Vào một ngày đẹp trời của mùa xuân, chúng ta thường quên mất rằng mọi người xung quanh đều khao khát được thấu hiểu và tôn trọng. Thay vì chỉ trích hay phàn nàn, hãy cố gắng đặt mình vào vị trí của người khác. Lòng bao dung và sự chân thành chính là chìa khóa mở rộng mọi cánh cửa tâm hồn. Hãy nhớ rằng nụ cười là món quà quý giá nhất mà bạn có thể trao tặng cho bất kỳ ai hôm nay.`,
  },
  {
    label: '🎈 Truyện thiếu nhi: Thỏ và Rùa',
    text: `Ngày xửa ngày xưa, trong một khu rừng xanh mát mẻ, có một chú Thỏ trắng xinh xắn và một bạn Rùa chậm chạp. Thỏ con luôn tự hào mình chạy nhanh nhất rừng. Một hôm, Thỏ huênh hoang rủ Rùa chạy thi: "Này Rùa ơi, đố bạn chạy đua thắng được tớ đấy!". Rùa mỉm cười hiền từ đáp: "Được thôi, chúng mình cùng thi nhé!". Khi tiếng còi vang lên, Thỏ cắm đầu chạy thật nhanh, rồi nghĩ bụng: "Rùa còn lâu mới tới, mình cứ ngủ một giấc đã". Trong khi Thỏ ngủ say sưa dưới bóng cây, bạn Rùa kiên trì từng bước một tiến về đích và đã giành chiến thắng vang dội!`,
  },
  {
    label: '🍼 Thơ mầm non: Chú Thỏ Trắng',
    text: `Thỏ trắng mắt hồng,
Đôi tai dài dài,
Đôi chân thoăn thoắt,
Thỏ chạy rất tài.
Thỏ thích ăn cà rốt,
Uống dòng nước mát trong,
Bé khen thỏ ngoan ngoãn,
Cả lớp đều mến yêu!`,
  },
  {
    label: '✨ Truyện cổ tích & Kể chuyện',
    text: `Ngày xửa ngày xưa, ở một ngôi làng ven sông Hồng trù phú, có một chàng tiều phu hiền lành, thật thà. Mỗi sáng sớm tinh sương khi sương mù còn vương trên ngọn tre, chàng đã mang rìu lên núi đốn củi. Tiếng chim hót líu lo hòa cùng tiếng lá rừng xào xạc tạo nên một bản nhạc êm đềm của thiên nhiên hoang sơ. Lòng tốt của chàng không chỉ khiến dân làng yêu mến mà còn làm cảm động cả thần linh.`,
  },
];

export const TextInputTab: React.FC<TextInputTabProps> = ({
  text,
  onChangeText,
  onClear,
  onGenerate,
  isGenerating,
}) => {
  const [copied, setCopied] = React.useState(false);
  const words = countWords(text);
  const chars = countChars(text);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Sample texts pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Mẫu thử nghiệm nhanh:
        </span>
        {SAMPLE_TEXTS.map((sample, i) => (
          <button
            key={i}
            onClick={() => onChangeText(sample.text)}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700/60"
          >
            {sample.label}
          </button>
        ))}
      </div>

      {/* Main Textarea Container */}
      <div className="relative rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition-all">
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Nhập hoặc dán văn bản tiếng Việt có dấu tại đây... (Ví dụ: truyện, bài phát biểu, tài liệu học tập, tin tức, hợp đồng...)"
          rows={10}
          className="w-full p-4 sm:p-5 text-sm sm:text-base bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-y leading-relaxed font-sans"
        />

        {/* Floating bottom status & actions bar inside editor */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 rounded-b-2xl">
          {/* Counters */}
          <div className="flex items-center space-x-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <strong className="text-slate-800 dark:text-slate-200 font-bold">
                {words.toLocaleString('vi-VN')}
              </strong>{' '}
              từ
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <strong className="text-slate-800 dark:text-slate-200 font-bold">
                {chars.toLocaleString('vi-VN')}
              </strong>{' '}
              ký tự
            </span>
            {words > 0 && (
              <>
                <span>•</span>
                <span className="text-xs text-rose-600 dark:text-rose-400">
                  Ước tính ~{Math.ceil(words / 150)} phút đọc
                </span>
              </>
            )}
          </div>

          {/* Quick utility buttons */}
          <div className="flex items-center space-x-2">
            {text && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition text-xs flex items-center gap-1 cursor-pointer"
                  title="Sao chép toàn bộ"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Sao chép</span>
                </button>

                <button
                  onClick={onClear}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-xs flex items-center gap-1 cursor-pointer"
                  title="Xóa toàn bộ nội dung"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa nội dung</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
