package expo.modules.mathakasms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Sends one (multi-part) SMS with Android's SmsManager. The JS side asks for the
// SEND_SMS permission first and falls back to the SMS app if this module is missing.
class MathakaSmsModule : Module() {
  private fun context(): Context? = appContext.reactContext

  private fun hasPermission(ctx: Context): Boolean =
    ctx.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

  override fun definition() = ModuleDefinition {
    Name("MathakaSms")

    Function("canSend") {
      val ctx = context()
      ctx != null &&
        ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY) &&
        hasPermission(ctx)
    }

    AsyncFunction("sendAsync") { phone: String, message: String ->
      val ctx = context() ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)
      if (!hasPermission(ctx)) {
        throw CodedException("ERR_NO_PERMISSION", "SEND_SMS permission is not granted", null)
      }
      val sms: SmsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          ctx.getSystemService(SmsManager::class.java) ?: throw CodedException("ERR_NO_SMS", "No SMS service", null)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }
      val parts = sms.divideMessage(message)
      sms.sendMultipartTextMessage(phone, null, parts, null, null)
      parts.size
    }
  }
}
