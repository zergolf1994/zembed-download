for i in {1..86400}
do
    localhost="127.0.0.1"
    data=$(curl -sLf "http://${localhost}/update/task/percent" | jq -r ".")
    status=$(echo $data | jq -r ".status")
    msg=$(echo $data | jq -r ".msg")
    
    if [[ $status == "false" ]]; then
        if [[ $msg == "no_file_task" ]]; then
            sleep 1
            exit 1
        fi

        if [[ $msg == "no_file_tmp" ]]; then
            sleep 3
        fi
        
        if [[ $msg == "download_error" ]]; then
            e_code=$(echo $data | jq -r ".e_code")
            slug=$(echo $data | jq -r ".slug")
            sleep 2
            curl -sS "http://${localhost}/error?slug=${slug}&e_code=${e_code}"
            exit 1
        fi

    fi


    if [[ $status == "ok" ]]; then
        echo "update percent"
        sleep 5
    fi

done