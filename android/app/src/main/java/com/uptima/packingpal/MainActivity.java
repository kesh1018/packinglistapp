package com.uptima.packingpal;

import android.os.Bundle;
import android.os.StrictMode;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (BuildConfig.DEBUG) {
            // Debug builds only: surface disk/network work on the main thread and leaked resources.
            StrictMode.setThreadPolicy(new StrictMode.ThreadPolicy.Builder().detectAll().penaltyLog().build());
            StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder().detectAll().penaltyLog().build());
        }
        super.onCreate(savedInstanceState);
    }
}
