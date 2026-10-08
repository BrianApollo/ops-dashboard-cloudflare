## Users (tblvN3ErbnvZ76Lzr)
  - Name : singleLineText
  - Email : email
  - Password : singleLineText
  - Role : singleSelect [Admin|Scriptwriter|Video Editor|Ops|Media]
  - Active : checkbox
  - Videos : multipleRecordLinks -> tblpb2c1RqYnALFTV
  - Video Scripts : multipleRecordLinks -> tbl7qb7Y2AzTfKBl8
  - Videos copy : multipleRecordLinks -> tblrP02jgMlNc6sF3

## Profiles (tble3Qky3A2j8LpSj)
  - Profile ID : singleLineText
  - Profile Name : singleLineText
  - Profile Status : singleLineText
  - Permanent Token : singleLineText
  - Permanent Token End Date : date
  - Refresh Token : button
  - Sync Data : button
  - Linked BM : multipleRecordLinks -> tbl1xnWkoju7WG8lb
  - Linked Pages : multipleRecordLinks -> tblUwiY8UQVi3yXBU
  - Profile FB Password : singleLineText
  - Profile Email : email
  - Profile Email Password : singleLineText
  - Profile 2FA : singleLineText
  - Profile Birth Date : date
  - Profile Gender : singleLineText
  - Profile Location : singleLineText
  - Profile Link : url
  - Profile Review Date : date
  - Profile Security Email : email
  - Security Email Password : singleLineText
  - Proxy : singleLineText
  - Last Sync : dateTime
  - Hidden : checkbox
  - Token Valid : checkbox
  - UID : singleLineText
  - Master Profile : multipleRecordLinks -> tblFkD3XanEvDgztj
  - Profile Year Created : singleLineText
  - Profile YouTube Handle : singleLineText
  - Profile FB UID : singleLineText
  - SOP 1 AdsPower Setup : checkbox
  - SOP 2 Initial Activity : checkbox
  - SOP 3 New Email : checkbox
  - SOP 4 Facebook Email : checkbox
  - SOP 5 Password : checkbox
  - SOP 6 2FA & Recovery : checkbox
  - SOP 7 BM Access : checkbox
  - SOP 8 Assets Assigned : checkbox
  - SOP 9 Page Access : checkbox
  - Setup Complete : checkbox
  - Setup Completed On : date
  - Original Data : multilineText
  - Extra Notes : multilineText
  - Linked AdsProfile : singleLineText
  - SOP 7 Screenshot : multipleAttachments
  - SOP 8 Screenshot : multipleAttachments
  - SOP 9 Screenshot : multipleAttachments
  - Recovery Codes : multilineText

## Business Managers (tbl1xnWkoju7WG8lb)
  - BM ID : singleLineText
  - Linked Profile : multipleRecordLinks -> tble3Qky3A2j8LpSj
  - BM Name : singleLineText
  - BM Status : singleLineText
  - Verification Status : singleLineText
  - Created Time : dateTime
  - Last Synced : dateTime
  - Linked Ad Accs : multipleRecordLinks -> tbltReEL235grY3Im
  - Linked Pixels : multipleRecordLinks -> tblsMDmQedp4B3pB8
  - Owned Pixels : multipleRecordLinks -> tblsMDmQedp4B3pB8
  - Ad Accounts : multipleRecordLinks -> tbltReEL235grY3Im
  - System User ID : singleLineText
  - System User Token : multilineText
  - System User Created : dateTime
  - Hidden : checkbox

## Ad Accounts (tbltReEL235grY3Im)
  - Ad Acc ID : singleLineText
  - Ad Acc Name : singleLineText
  - Ad Acc Status : singleLineText
  - Disable Reason : singleLineText
  - Linked BM : multipleRecordLinks -> tbl1xnWkoju7WG8lb
  - Owner BM : multipleRecordLinks -> tbl1xnWkoju7WG8lb
  - Last Synced : dateTime
  - Used In Campaigns : singleLineText
  - Currency : singleLineText
  - Amount Spent : number
  - Account Type : singleLineText
  - Hidden : checkbox
  - Timezone : singleLineText

## Pages (tblUwiY8UQVi3yXBU)
  - Page ID : singleLineText
  - Page Name : singleLineText
  - Published : singleLineText
  - Page Link : singleLineText
  - Verification Status : singleLineText
  - Linked Profiles : multipleRecordLinks -> tble3Qky3A2j8LpSj
  - Last Synced : dateTime
  - Fan Count : number
  - Hidden : checkbox

## Pixels (tblsMDmQedp4B3pB8)
  - Pixel ID : singleLineText
  - Pixel Name : singleLineText
  - Available : singleLineText
  - Last Fired Time : dateTime
  - Creation Time : dateTime
  - Linked BMs : multipleRecordLinks -> tbl1xnWkoju7WG8lb
  - Owner BM : multipleRecordLinks -> tbl1xnWkoju7WG8lb
  - Last Synced : dateTime
  - Used In Campaigns : singleLineText
  - Hidden : checkbox

## Products (tbl1haQz7j9qlE9XE)
  - Product Name : singleLineText
  - RecordID : formula (COMPUTED)
  - Product Logo : multipleAttachments
  - Product Images : multipleAttachments
  - Advertorials : multipleRecordLinks -> tblYiqgkE6NYQj21s
  - Status : singleSelect [Preparing|Active|Benched]
  - Video Scripts : multipleRecordLinks -> tbl7qb7Y2AzTfKBl8
  - Videos : multipleRecordLinks -> tblpb2c1RqYnALFTV
  - Unused Videos : multipleLookupValues (COMPUTED)
  - Campaigns : multipleRecordLinks -> tblueon6lG95vAu5l
  - Images : multipleRecordLinks -> tbl7OCC0E1ICXXffI
  - Ad Profiles : multipleRecordLinks -> tblMcc1SdR3kLdpD0
  - Temp Images : multipleRecordLinks -> tbl9lFboovT1cJTSo
  - Drive Link : url
  - Campaigns [Count] : count (COMPUTED)
  - Active Campaigns [Count] : count (COMPUTED)
  - Video Scripts [Count] : count (COMPUTED)
  - Video Scripts To Assign [Count] : count (COMPUTED)
  - Video [Count] : count (COMPUTED)
  - To Do Video [Count] : count (COMPUTED)
  - Available Video [Count] : count (COMPUTED)
  - Used Video [Count] : count (COMPUTED)
  - Image [Count] : count (COMPUTED)
  - Available Image [Count] : count (COMPUTED)
  - Videos copy : multipleRecordLinks -> tblrP02jgMlNc6sF3
  - Campaign Launch Setup : multipleRecordLinks -> tblkQzt0h5rBFbRH6

## Advertorials (tblYiqgkE6NYQj21s)
  - Advertorial Name : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Advertorial Text : richText
  - Final Advertorial Link : url
  - Advertorial Checked : checkbox

## Ad Presets (tblMcc1SdR3kLdpD0)
  - Preset Name : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Primary Text 1 : multilineText
  - Primary Text 2 : multilineText
  - Primary Text 3 : multilineText
  - Primary Text 4 : multilineText
  - Primary Text 5 : multilineText
  - Headline 1 : singleLineText
  - Headline 2 : singleLineText
  - Headline 3 : singleLineText
  - Headline 4 : singleLineText
  - Headline 5 : singleLineText
  - Description 1 : singleLineText
  - Description 2 : singleLineText
  - Description 3 : singleLineText
  - Description 4 : singleLineText
  - Description 5 : singleLineText
  - Call to Action : singleLineText
  - Beneficiary Name : singleLineText
  - Payer Name : singleLineText
  - Campaigns : multipleRecordLinks -> tblueon6lG95vAu5l

## Campaigns (tblueon6lG95vAu5l)
  - Name : multilineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Ad Acc Used : singleLineText
  - Status : singleSelect [Preparing|Launched|Cancelled]
  - Nadeems PDF : multipleAttachments
  - Funnel Checked : singleSelect [No|Yes]
  - Sakshis Video : multipleAttachments
  - Platform : singleSelect [Facebook|Google|TikTok|Organic]
  - RedTrack Campaign Id : singleLineText
  - RedTrack Campaign Name : singleLineText
  - Token Type : singleLineText
  - Video Scripts [Count] : number
  - Video [Count] : number
  - Available Video [Count] : number
  - In Progress Video [Count] : number
  - Location Targeting : singleLineText
  - Page Used : singleLineText
  - Pixel Used : singleLineText
  - Selected Ad Profile : multipleRecordLinks -> tblMcc1SdR3kLdpD0
  - Website Url : url
  - UTMs : singleLineText
  - Videos Used In This Campaign : multipleRecordLinks -> tblpb2c1RqYnALFTV
  - Images Used In This Campaign : multipleRecordLinks -> tbl7OCC0E1ICXXffI
  - Budget : currency
  - Launch Date : dateTime
  - Launch Time : singleLineText
  - Launched Data : multilineText
  - FB Campaign ID : singleLineText
  - FB Ad Account ID : singleLineText
  - Launch Profile ID : singleLineText
  - Reuse Creatives : checkbox
  - Display Link : singleLineText
  - CTA : singleLineText
  - Launch As Active : checkbox
  - Link Variable : singleLineText
  - Profile ID : singleLineText
  - Videos copy : multipleRecordLinks -> tblrP02jgMlNc6sF3
  - Schedule : multipleRecordLinks -> tblOPFwzts4bShrLH
  - Scaling Rules : multipleRecordLinks -> tblsTmZYWX28hTOwN

## Video Scripts (tbl7qb7Y2AzTfKBl8)
  - Name : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Author : multipleRecordLinks -> tblvN3ErbnvZ76Lzr
  - Script Content : richText
  - Videos : multipleRecordLinks -> tblpb2c1RqYnALFTV
  - Editor (from Videos) : multipleLookupValues (COMPUTED)
  - Notes : singleLineText
  - Scripts To Do : count (COMPUTED)
  - Scripts Past To Do : count (COMPUTED)
  - Calculation : formula (COMPUTED)
  - Hook : multilineText
  - Body : multilineText
  - Hook Number : number
  - Base Script Number : number

## Videos (tblpb2c1RqYnALFTV)
  - Video Name : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Script : multipleRecordLinks -> tbl7qb7Y2AzTfKBl8
  - Author (from Script) : multipleLookupValues (COMPUTED)
  - Format : singleSelect [Square|Vertical|YouTube]
  - Editor : multipleRecordLinks -> tblvN3ErbnvZ76Lzr
  - Text Version : singleSelect [Text|No Text]
  - Creative Link : url
  - Status : singleSelect [To Do|Review|Available|Used]
  - Notes : multilineText
  - Script Content (from Script) : multipleLookupValues (COMPUTED)
  - Scrollstopper Number : number
  - Identifier : formula (COMPUTED)
  - Used In Campaign : multipleRecordLinks -> tblueon6lG95vAu5l
  - Video Data : multilineText
  - First Upload At : date
  - Last Upload At : lastModifiedTime
  - Parent Drive Link : multipleLookupValues (COMPUTED)

## AI Videos (tblrP02jgMlNc6sF3)
  - Video Name : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Script : singleLineText
  - Author (from Script) : multipleLookupValues (COMPUTED)
  - Format : singleSelect [Square|Vertical|YouTube]
  - Editor : multipleRecordLinks -> tblvN3ErbnvZ76Lzr
  - Text Version : singleSelect [Text|No Text]
  - Creative Link : url
  - First Upload At : date
  - Status : singleSelect [To Do|Review|Available|Used]
  - Notes : multilineText
  - Used In Campaign : multipleRecordLinks -> tblueon6lG95vAu5l
  - Video Data : multilineText
  - Parent Drive Link : multipleLookupValues (COMPUTED)
  - Last Upload At : lastModifiedTime
  - Script Content (from Script) : multipleLookupValues (COMPUTED)
  - Scrollstopper Number : number
  - Identifier : formula (COMPUTED)
  - Choosen Editors Best Video : singleLineText
  - Lauched Campaigns : singleLineText
  - Notes 2 : formula (COMPUTED)
  - Notes 2 copy : multilineText

## Images (tbl7OCC0E1ICXXffI)
  - Image Name : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Image Drive Link : url
  - Used In Campaigns : multipleRecordLinks -> tblueon6lG95vAu5l
  - Prompt : multilineText
  - Count : number
  - Creator : singleLineText
  - Lauched Campaigns : singleLineText

## Temp Images (tbl9lFboovT1cJTSo)
  - id : formula (COMPUTED)
  - Name : singleLineText
  - Image Drive Link : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE

## Master Profile (tblFkD3XanEvDgztj)
  - Name : singleLineText
  - Profile Record : multipleRecordLinks -> tble3Qky3A2j8LpSj

## Campaign Launch Setup (tblkQzt0h5rBFbRH6)
  - Name : singleLineText
  - Product : multipleRecordLinks -> tbl1haQz7j9qlE9XE
  - Count : number
  - Ad Account : singleLineText
  - Pixel : singleLineText
  - Page : singleLineText
  - Amount : singleLineText
  - Call to Action : singleLineText
  - Targeting : singleLineText

## Profile Setup Summary (tbl2zrm40IvsLLPB7)
  - Person : singleLineText
  - Profile UID : singleLineText
  - Business Managers : multilineText
  - Ad Accounts : multilineText
  - Pages : multilineText
  - Pixels : multilineText
  - Team Access : multilineText
  - Setup Status : singleSelect [Not started|In progress|Ready to launch|Done]
  - To Do (you fill in) : multilineText
  - Notes : multilineText

## Schedule (tblOPFwzts4bShrLH)
  - Formula : formula (COMPUTED)
  - Campaign Id : singleLineText
  - Linked Campaign : multipleRecordLinks -> tblueon6lG95vAu5l
  - Name (from Linked Campaign) : multipleLookupValues (COMPUTED)
  - Source : singleSelect [Manual|Rule]
  - Type : singleSelect [Budget Change|Status Change]
  - Execute : singleLineText
  - Scheduled At : date
  - Status : singleSelect [Pending|Running|Success|Failed]
  - Executed At : date
  - Response : singleLineText
  - Last Reponse Time : lastModifiedTime
  - From Rule : multipleRecordLinks -> tblsTmZYWX28hTOwN

## Scaling Rules (tblsTmZYWX28hTOwN)
  - Name : singleLineText
  - Rule Scope : singleSelect [Global|Scoped]
  - Applies to [Campaigns] : multipleRecordLinks -> tblueon6lG95vAu5l
  - Select : singleSelect [Budget Chnage|Status Change|Maxiumum Global Budget]
  - Check At : singleLineText
  - If : singleLineText
  - Then : singleLineText
  - Execute Action At : singleLineText
  - Schedule : multipleRecordLinks -> tblOPFwzts4bShrLH
  - Rule Execution Log : multipleRecordLinks -> tbl8DkUsl5e7kYHIx

## Rule Execution Log (tbl8DkUsl5e7kYHIx)
  - Rule Name : singleLineText
  - Executed At : date
  - Campaigns Evaluated : number
  - Campaigns Matched : number
  - Actions Taken : multilineText
  - Status : singleSelect [Success|Partial|Failed|No Match|Dry Run]
  - Error : multilineText
  - Duration (ms) : number
  - Rule ID : multipleRecordLinks -> tblsTmZYWX28hTOwN
