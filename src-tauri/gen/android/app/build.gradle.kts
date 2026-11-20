import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.jayo14.noted"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.jayo14.noted"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "4").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "0.1.4")
    }
    signingConfigs {
        create("release") {
            val keyStorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                ?: tauriProperties.getProperty("tauri.android.storePassword")
                ?: "notedandroid2026"
            val keyPasswordVal = System.getenv("ANDROID_KEY_PASSWORD")
                ?: tauriProperties.getProperty("tauri.android.keyPassword")
                ?: keyStorePassword
            val keyAliasVal = System.getenv("ANDROID_KEY_ALIAS")
                ?: tauriProperties.getProperty("tauri.android.keyAlias")
                ?: "noted"
            val keyStorePath = System.getenv("ANDROID_KEYSTORE_PATH")
                ?: tauriProperties.getProperty("tauri.android.keystorePath")
                ?: "noted-release.jks"

            val ksFile = file(keyStorePath)
            if (ksFile.exists()) {
                storeFile = ksFile
                storePassword = keyStorePassword
                keyAlias = keyAliasVal
                keyPassword = keyPasswordVal
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {
                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            val releaseSigning = signingConfigs.getByName("release")
            if (releaseSigning.storeFile != null && releaseSigning.storeFile!!.exists()) {
                signingConfig = releaseSigning
            } else {
                signingConfig = signingConfigs.getByName("debug")
            }
            optimization {
               enable = true
            }
            proguardFiles(
                *fileTree(".") {
                  include("**/*.pro")
                  exclude("build/**")
                }.files.toTypedArray()
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_17
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

val tauriBuildScript = file("tauri.build.gradle.kts")
if (tauriBuildScript.exists()) {
    apply(from = tauriBuildScript)
}
