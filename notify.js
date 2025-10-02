const notifier = require('node-notifier');
const path = require('path');

// 通知を送信
notifier.notify(
  {
    title: '🎉 Claude Code',
    message: 'コーディングが完了しました！',
    icon: path.join(__dirname, 'public', 'favicon.ico'), // アイコン（オプション）
    sound: true, // 通知音を鳴らす
    wait: false, // 通知が閉じられるまで待たない
    timeout: 5 // 5秒後に自動的に閉じる
  },
  (err, response) => {
    if (err) {
      console.error('通知エラー:', err);
    } else {
      console.log('✅ 通知を送信しました');
    }
  }
);
