"use client";

import { useState } from "react";
import { MEETING_FORMAT, MEETING_KIND, type MeetingKind } from "@/lib/types";
import { Field, Select } from "@/components/ui";

/*
 * 「種類」と「区分（オンライン/オフライン）」の組。
 * 区分は MTG のときだけ意味があるので、call📞 / memo を選んだら隠す
 * （隠している間は送信もされないため、サーバー側では format を null で保存する）。
 * 種類の選択で表示が変わるため、この2つだけクライアント側で持つ。
 */
export function KindFormatFields({
  defaultKind = "mtg",
  defaultFormat = "",
}: {
  defaultKind?: MeetingKind;
  defaultFormat?: string;
}) {
  const [kind, setKind] = useState<MeetingKind>(defaultKind);

  return (
    <>
      <Field htmlFor="kind" label="種類" required>
        <Select
          id="kind"
          name="kind"
          required
          value={kind}
          onChange={(e) => setKind(e.target.value as MeetingKind)}
        >
          {Object.entries(MEETING_KIND).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      {kind === "mtg" && (
        <Field htmlFor="format" label="区分" required>
          <Select id="format" name="format" required defaultValue={defaultFormat}>
            <option value="">（選択してください）</option>
            {Object.entries(MEETING_FORMAT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </>
  );
}
