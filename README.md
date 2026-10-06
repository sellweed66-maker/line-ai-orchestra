# AI Hub Control

สร้างเว็บแอพ AI Hub (ระบบศูนย์กลางควบคุมแอพดาวเทียมผ่าน AI และ LINE) ด้วยดีไซน์สไตล์มินิมอล โมเดิร์น คลีน ใช้งานง่ายบนมือถือ มีระบบดังนี้:

1. ระบบ AI Rotation & Fallback Engine (สลับโมเดลอัตโนมัติ):
- รองรับ 3 ผู้ให้บริการ: Google Gemini (หลัก), Groq (สำรอง 1), OpenRouter (สำรอง 2)
- ยิงคำสั่งไปหาตัวหลักก่อนเสมอ หากเจอข้อผิดพลาด (Rate Limit, Quota เต็ม, Error 429) ให้สลับไปใช้ตัวสำรองลำดับถัดไปทันทีแบบอัตโนมัติโดยไม่สะดุด
- หน้า "AI Settings" สำหรับกรอกและบันทึก API Key ของแต่ละค่าย (เก็บเป็น secret, ไม่แสดงค่าเต็มกลับมา) พร้อมสวิตช์เปิด/ปิดการใช้งานแต่ละตัว และแสดงสถานะการเชื่อมต่อ
- เริ่มต้นใช้งานได้ทันทีแม้มี Key แค่ตัวเดียว ระบบหมุนใช้เฉพาะตัวที่มี Key

2. หน้าแชตสั่งงาน AI (Chat Console):
- รองรับคำสั่งภาษาไทย สั่งงานด้วยภาษาพูดทั่วไป
- AI มี Tool Calling เพื่อดึงข้อมูลหรือส่งคำสั่งไปยังแอพดาวเทียมที่เชื่อมต่อไว้
- แสดงผลลัพธ์ชัดเจน พร้อมปุ่มยืนยัน (Confirm Dialog) สำหรับคำสั่งเสี่ยง เช่น ลบหรือแก้ไขข้อมูลสำคัญ — AI ต้องถามยืนยันทุกครั้งก่อนทำคำสั่งประเภทนี้ ไม่ทำเองโดยลำพัง

3. ระบบจัดการแอพดาวเทียม (Satellite Apps Manager):
- หน้าเพิ่ม/แก้ไข/ลบแอพดาวเทียม (กรอกชื่อแอพ, Base URL, Agent API Key)
- ปุ่ม "Sync Tools" ยิงไปดึงรายการเครื่องมือจาก GET /api/agent/tools ของแอพปลายทาง (รับ {action, description, parameters} แล้วเก็บไว้ให้ AI ใช้เรียกผ่าน POST /api/agent/exec)
- แสดงสถานะ Online/Offline ของแต่ละแอพ

4. ระบบเชื่อมต่อ LINE & รายงานบิล (LINE Integration):
- หน้าตั้งค่า LINE Messaging API (Channel Access Token และ Channel Secret)
- บันทึก Group ID / User ID สำหรับส่งข้อความ
- รับคำสั่งผ่าน LINE Webhook ให้เจ้าของร้านพิมพ์สั่ง AI ผ่าน LINE ได้ (ตรวจ signature ทุก request และอนุญาตเฉพาะ User ID เจ้าของร้านที่ whitelist ไว้)
- ส่งสรุปยอดขาย/รายงานบิลเข้ากลุ่มไลน์ในรูปแบบข้อความที่จัดรูปแบบอ่านง่าย

5. ระบบบันทึกและความปลอดภัย:
- หน้า Log แสดงประวัติคำสั่งทั้งหมดที่ AI ทำ (เวลา, คำสั่ง, แอปปลายทาง, ผลลัพธ์) ย้อนดูได้
- ปุ่ม Export ข้อมูลสำคัญออกเป็น CSV ได้ตั้งแต่วันแรก ให้มีทางถอยเสมอ

6. ระบบปรับแต่งหน้าตาและไอคอน:
- หน้า "Appearance Settings": เลือกโทนสีหลัก, สลับโหมด Light / Dark
- เปลี่ยนชื่อร้าน, อัปโหลดหรือเปลี่ยนไอคอนโลโก้ (รองรับเลือกจากคลัง Lucide Icons)
- โครงสร้าง UI แยกเป็น Modular Components ชัดเจน ง่ายต่อการปรับแต่งเพิ่มหน้าใหม่ในอนาคต

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://line-ai-orchestra.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/62d01fcf-4aba-4525-b2c1-7714315224f4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
