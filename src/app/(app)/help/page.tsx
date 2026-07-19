// 使い方ガイド。難しい判断は不要にし、流れどおり埋めていけば回るように書く。
// 静的コンテンツのみ（DB接続なし）。

import {
  Banner,
  Card,
  CardBody,
  PageHeader,
  PageShell,
  SectionTitle,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";

const steps = [
  {
    title: "① 案件の入口（候補→今週のアプローチ先）",
    body: "Uber Eatsの急成長アカウントから抽出された会社は「候補（抽出済）」列に入る。週1回、山路さんがアプローチする先を選んで「今週のアプローチ先」列へ動かす。石田さんは「今週のアプローチ先」列だけ見れば、自分が着手するものが分かる。",
  },
  {
    title: "② ステージを進める（ボードの「→ 次へ」）",
    body: "候補（抽出済）→今週のアプローチ先→アプローチ中→商談設定→商談実施→条件調整→契約→ブランド化→SV案内可能（ゴール）。各ステージに入ると「やることリスト（タスク雛形）」が自動で追加される。必須タスクが全部終わるとカードに「→ 次へ」ボタンが出て、押すと次のステージへ進む。「商談実施」「契約」に進んだ時点でKPIが自動カウントされる（手で数えなくてよい）。",
  },
  {
    title: "③ 契約したら「ブランド化」",
    body: "契約後はブランド化ステージで、PB品の確定調査・代替品探索・ブランド共創・原価とマニュアル・ロイヤリティ確定・SVキックオフを進める（タスクが自動で入る）。全部終わると「SV案内可能」＝SVが加盟店に案内できる状態＝ゴール。",
  },
  {
    title: "④ 見送り・失注のとき",
    body: "時期が合わない会社は「時期見送り」へ（再アプローチ予定日を決めるタスクが自動で入る）。断られたら「失注」へ動かし、理由（提案前NG／提案後NG）を残す。",
  },
  {
    title: "⑤ 商談したらMTGログ",
    body: "「MTG」→記録。オンライン/オフライン・話した要点を残す。商談ではPB品の有無を必ず聞き、案件の「PB品の状態」を更新する。困ったことがあれば場面（PB品／メーカー紹介／価格／契約書）と内容を書く。",
  },
];

const dailyScreens = [
  { name: "ダッシュボード", when: "朝いちばん", what: "今Qの商談・契約の進み具合、次アクションが空の案件、ジャンルの狙い目を確認する" },
  { name: "案件（ボード）", when: "1日中", what: "ステージ別のカンバン。必須タスクを消化して「→ 次へ」で進める。上部に今Qの目標進捗が常に出る" },
  { name: "パートナー", when: "紹介があった時", what: "誰から紹介された／誰に紹介したかを記録する" },
  { name: "MTGログ", when: "打ち合わせの後", what: "話した内容と困ったことを残す" },
];

const tips = [
  {
    title: "ボードの見方",
    body: "「標準／コンパクト」で表示の広さを切り替えられる。時期見送り・失注の列は普段たたんであり、細い帯をクリックすると開く。ジャンルに「済」が付いた案件は、そのジャンルで既に契約があるため優先度低（1ジャンル1契約が基本）。",
  },
  {
    title: "タスク雛形について",
    body: "ステージに入ると標準のやることリストが自動で入る。合わないタスクは完了にせず放置でよい（任意タスクは残っていても進める）。昔からある案件でタスクが空のものは、案件詳細の「雛形から追加」で入れられる。雛形の中身は足し引きできるので、現場に合わない項目があれば山路さん・Toyoさんに伝える。",
  },
  {
    title: "企業規模（大手/中小）",
    body: "取引先ごとに設定する。基準は「国内店舗数 30店舗以上なら大手」。規模別に商談の進む速さを計測して、営業計画に使う。※ 移行時にAIが旧基準で仮に付けた分類が残っているため、気づいたら画面上で直してほしい。",
  },
];

export default function HelpPage() {
  return (
    <PageShell>
      <PageHeader
        title="使い方ガイド"
        description="難しく考えず、下の流れどおりに埋めていけば大丈夫です。"
      />

      <section className="mb-8">
        <SectionTitle>まず覚えるのはこの4画面だけ</SectionTitle>
        <Card>
          <Table caption="毎日使う4画面と、それぞれをいつ見て何をするか">
            <THead>
              <TR className="hover:bg-transparent">
                <TH>画面</TH>
                <TH>いつ見る</TH>
                <TH>何をする</TH>
              </TR>
            </THead>
            <TBody>
              {dailyScreens.map((s) => (
                <TR key={s.name}>
                  <TD className="whitespace-nowrap font-medium">{s.name}</TD>
                  <TD className="whitespace-nowrap text-ink-soft">{s.when}</TD>
                  <TD className="text-ink-soft">{s.what}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </section>

      <section className="mb-8">
        <SectionTitle>案件を進める基本の流れ</SectionTitle>
        <div className="space-y-3">
          {steps.map((s) => (
            <Card key={s.title}>
              <CardBody>
                <h3 className="text-sm font-medium text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle>知っておくと便利</SectionTitle>
        <div className="space-y-3">
          {tips.map((t) => (
            <Card key={t.title}>
              <CardBody>
                <h3 className="text-sm font-medium text-ink">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {t.body}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <Banner tone="info" title="山路さんに聞きたい時（ラリーを減らす仕組み）">
        一人で判断できないこと（PB品どうする、メーカー紹介いる？等）が出たら、案件やMTGログから「困ったこと」として登録してください。
        「ナレッジ」画面の確認キューに上がり、山路さんが回答すると、次に同じ場面が来たとき案件画面に自動で表示されます。
        使うほど自分で判断できる範囲が広がります。
      </Banner>

      <p className="mt-8 text-xs text-ink-faint">
        困ったら画面が真っ白／エラー表示になっても、入力は「あとで直せる」ので、まず埋めることを優先してください。
      </p>
    </PageShell>
  );
}
